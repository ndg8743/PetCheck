/**
 * Google OAuth Authentication Service
 */

import { OAuth2Client, TokenPayload } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { createLogger } from '../logger';
import { redis } from '../redis';
import { config } from '../../config';
import {
  User,
  UserRole,
  LoginResponse,
  AuthTokenPayload,
  DEFAULT_USER_PREFERENCES,
} from '@petcheck/shared';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('google-auth');

// In-memory user store (in production, use a database)
const userStore: Map<string, User> = new Map();
// Index for O(1) Google ID lookups instead of O(n)
const googleIdIndex: Map<string, string> = new Map(); // googleId -> userId

// Initialize Google OAuth client
const oAuth2Client = new OAuth2Client(config.google.clientId);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

export class GoogleAuthService {
  /**
   * Verify Google ID token and extract user info
   */
  async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await oAuth2Client.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      if (!payload.email) {
        throw new Error('Email not provided in token');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        avatarUrl: payload.picture,
        emailVerified: payload.email_verified || false,
      };
    } catch (error) {
      logger.error('Google token verification failed:', error);
      throw new Error('Invalid Google token');
    }
  }

  /**
   * Sign in or register a user with Google
   */
  async signInWithGoogle(idToken: string): Promise<LoginResponse> {
    const googleUser = await this.verifyGoogleToken(idToken);

    // Find or create user
    let user = await this.findUserByGoogleId(googleUser.googleId);

    if (!user) {
      user = await this.createUser(googleUser);
      logger.info(`New user registered: ${user.email}`);
    } else {
      // Update last login
      user.lastLoginAt = new Date();
      await this.saveUser(user);
      logger.info(`User logged in: ${user.email}`);
    }

    // Generate JWT token
    const token = this.generateToken(user);
    const expiresAt = this.getTokenExpiration();

    // Store session in Redis
    await this.storeSession(user.id, token);

    return {
      user,
      token,
      expiresAt,
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<AuthTokenPayload> {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;

      // Check if session is valid in Redis (skip if Redis unavailable)
      try {
        const sessionKey = `session:${payload.userId}`;
        const storedToken = await redis.get(sessionKey);

        if (storedToken && storedToken !== token) {
          throw new Error('Session invalid or expired');
        }
        // If storedToken is null (Redis down or session not stored), allow through
      } catch (redisError) {
        // Redis unavailable - validate JWT only
        logger.warn('Redis unavailable for session validation - using JWT only');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return userStore.get(userId) || null;
  }

  /**
   * Find user by Google ID - O(1) using index
   */
  private async findUserByGoogleId(googleId: string): Promise<User | null> {
    const userId = googleIdIndex.get(googleId);
    if (!userId) return null;
    return userStore.get(userId) || null;
  }

  /**
   * Create a new user
   */
  private async createUser(googleUser: GoogleUserInfo): Promise<User> {
    const user: User = {
      id: uuidv4(),
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.avatarUrl,
      role: 'pet_owner', // Default role
      googleId: googleUser.googleId,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      preferences: { ...DEFAULT_USER_PREFERENCES },
      isActive: true,
    };

    await this.saveUser(user);
    return user;
  }

  /**
   * Save user to store
   */
  private async saveUser(user: User): Promise<void> {
    userStore.set(user.id, user);

    // Maintain Google ID index for O(1) lookups
    if (user.googleId) {
      googleIdIndex.set(user.googleId, user.id);
    }

    // Also persist to Redis for durability (in production, use database)
    try {
      await redis.set(
        `user:${user.id}`,
        JSON.stringify(user),
        'EX',
        config.cache.userSession
      );
    } catch (error) {
      // Redis unavailable - user is still stored in memory
      logger.warn('Failed to persist user to Redis - using in-memory store only');
    }
  }

  /**
   * Update user role (admin function)
   */
  async updateUserRole(userId: string, role: UserRole, adminUserId: string): Promise<User> {
    const adminUser = await this.getUserById(adminUserId);
    if (!adminUser || adminUser.role !== 'admin') {
      throw new Error('Unauthorized to change user roles');
    }

    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.role = role;
    await this.saveUser(user);

    logger.info(`User ${userId} role updated to ${role} by admin ${adminUserId}`);
    return user;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<User['preferences']>
  ): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.preferences = {
      ...user.preferences,
      ...preferences,
    };

    await this.saveUser(user);
    return user;
  }

  /**
   * Sign out user
   */
  async signOut(userId: string): Promise<void> {
    try {
      const sessionKey = `session:${userId}`;
      await redis.del(sessionKey);
    } catch (error) {
      // Redis unavailable - session deletion skipped
      logger.warn('Failed to delete session from Redis');
    }
    logger.info(`User ${userId} signed out`);
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string {
    const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as string,
      issuer: config.jwt.issuer,
    } as jwt.SignOptions);
  }

  /**
   * Get token expiration date
   */
  private getTokenExpiration(): Date {
    const expiresIn = config.jwt.expiresIn;
    let ms = 0;

    if (expiresIn.endsWith('d')) {
      ms = parseInt(expiresIn) * 24 * 60 * 60 * 1000;
    } else if (expiresIn.endsWith('h')) {
      ms = parseInt(expiresIn) * 60 * 60 * 1000;
    } else if (expiresIn.endsWith('m')) {
      ms = parseInt(expiresIn) * 60 * 1000;
    } else {
      ms = parseInt(expiresIn) * 1000;
    }

    return new Date(Date.now() + ms);
  }

  /**
   * Store session in Redis (gracefully handles Redis unavailability)
   */
  private async storeSession(userId: string, token: string): Promise<void> {
    try {
      const sessionKey = `session:${userId}`;
      await redis.set(sessionKey, token, 'EX', config.cache.userSession);
    } catch (error) {
      // Redis unavailable - session won't be stored but auth still works
      logger.warn('Failed to store session in Redis - continuing without session storage');
    }
  }

  /**
   * Check if Google OAuth is configured
   */
  isConfigured(): boolean {
    return !!config.google.clientId && !!config.google.clientSecret;
  }

  /**
   * Sign in as guest user (for demo/testing)
   */
  async signInAsGuest(): Promise<LoginResponse> {
    // Create or find the guest user
    const guestId = 'guest-user-001';
    let user = userStore.get(guestId);

    if (!user) {
      user = {
        id: guestId,
        email: 'guest@petcheck.demo',
        name: 'Guest User',
        avatarUrl: undefined,
        role: 'pet_owner',
        googleId: 'guest',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        preferences: { ...DEFAULT_USER_PREFERENCES },
        isActive: true,
      };
      await this.saveUser(user);
      logger.info('Guest user created');
    } else {
      user.lastLoginAt = new Date();
      await this.saveUser(user);
    }

    const token = this.generateToken(user);
    const expiresAt = this.getTokenExpiration();
    await this.storeSession(user.id, token);

    logger.info('Guest user logged in');
    return { user, token, expiresAt };
  }
}

export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
