/**
 * Google OAuth Authentication Service
 * With PostgreSQL persistence and multi-device session support
 */

import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createLogger } from '../logger';
import { redis } from '../redis';
import { userRepository, sessionRepository, Session } from '../database';
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

// Initialize Google OAuth client
const oAuth2Client = new OAuth2Client(config.google.clientId);

// Maximum sessions per user (prevents unlimited device accumulation)
const MAX_SESSIONS_PER_USER = 10;

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

export interface DeviceInfo {
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionInfo {
  id: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  createdAt: Date;
  lastActiveAt: Date;
  current: boolean;
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
   * Supports multi-device login
   */
  async signInWithGoogle(idToken: string, deviceInfo?: DeviceInfo): Promise<LoginResponse> {
    const googleUser = await this.verifyGoogleToken(idToken);

    // Find or create user in PostgreSQL
    let user = await userRepository.findByGoogleId(googleUser.googleId);

    if (!user) {
      user = await this.createUser(googleUser);
      logger.info(`New user registered: ${user.email}`);
    } else {
      // Update last login
      user.lastLoginAt = new Date();
      user = await userRepository.update(user);
      logger.info(`User logged in: ${user.email}`);
    }

    // Generate JWT token
    const token = this.generateToken(user);
    const expiresAt = this.getTokenExpiration();

    // Create session for this device
    await this.createSession(user.id, token, expiresAt, deviceInfo);

    // Cache user in Redis for fast lookups
    await this.cacheUser(user);

    return {
      user,
      token,
      expiresAt,
    };
  }

  /**
   * Verify JWT token and validate session
   */
  async verifyToken(token: string): Promise<AuthTokenPayload> {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;
      const tokenHash = this.hashToken(token);

      // Check session exists in PostgreSQL
      const session = await sessionRepository.findByTokenHash(tokenHash);
      if (!session) {
        throw new Error('Session not found or expired');
      }

      // Update last active time (async, don't wait)
      sessionRepository.updateLastActive(session.id).catch((err) => {
        logger.warn('Failed to update session last active:', err);
      });

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
   * Get user by ID (with Redis cache)
   */
  async getUserById(userId: string): Promise<User | null> {
    // Try Redis cache first
    try {
      const cached = await redis.get(`user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.debug('Redis cache miss for user');
    }

    // Fallback to PostgreSQL
    const user = await userRepository.findById(userId);
    if (user) {
      await this.cacheUser(user);
    }
    return user;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string, currentToken?: string): Promise<SessionInfo[]> {
    const sessions = await sessionRepository.findByUserId(userId);
    const currentTokenHash = currentToken ? this.hashToken(currentToken) : null;

    return sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      current: session.tokenHash === currentTokenHash,
    }));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const sessions = await sessionRepository.findByUserId(userId);
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    await sessionRepository.delete(sessionId);
    logger.info(`Session ${sessionId} revoked for user ${userId}`);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(userId: string, currentToken: string): Promise<number> {
    const sessions = await sessionRepository.findByUserId(userId);
    const currentTokenHash = this.hashToken(currentToken);

    let revokedCount = 0;
    for (const session of sessions) {
      if (session.tokenHash !== currentTokenHash) {
        await sessionRepository.delete(session.id);
        revokedCount++;
      }
    }

    logger.info(`Revoked ${revokedCount} sessions for user ${userId}`);
    return revokedCount;
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
      role: 'pet_owner',
      googleId: googleUser.googleId,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      preferences: { ...DEFAULT_USER_PREFERENCES },
      isActive: true,
    };

    return await userRepository.create(user);
  }

  /**
   * Create a session for a device
   */
  private async createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    deviceInfo?: DeviceInfo
  ): Promise<Session> {
    // Enforce max sessions limit
    const sessionCount = await sessionRepository.countByUserId(userId);
    if (sessionCount >= MAX_SESSIONS_PER_USER) {
      // Remove oldest sessions
      const sessions = await sessionRepository.findByUserId(userId);
      const sessionsToRemove = sessions.slice(MAX_SESSIONS_PER_USER - 1);
      for (const session of sessionsToRemove) {
        await sessionRepository.delete(session.id);
      }
      logger.info(`Removed ${sessionsToRemove.length} old sessions for user ${userId}`);
    }

    const session: Session = {
      id: uuidv4(),
      userId,
      tokenHash: this.hashToken(token),
      deviceName: deviceInfo?.deviceName || this.parseDeviceName(deviceInfo?.userAgent),
      deviceType: deviceInfo?.deviceType || this.parseDeviceType(deviceInfo?.userAgent),
      ipAddress: deviceInfo?.ipAddress,
      userAgent: deviceInfo?.userAgent,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt,
    };

    return await sessionRepository.create(session);
  }

  /**
   * Update user role (admin function)
   */
  async updateUserRole(userId: string, role: UserRole, adminUserId: string): Promise<User> {
    const adminUser = await this.getUserById(adminUserId);
    if (!adminUser || adminUser.role !== 'admin') {
      throw new Error('Unauthorized to change user roles');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.role = role;
    const updatedUser = await userRepository.update(user);
    await this.cacheUser(updatedUser);

    logger.info(`User ${userId} role updated to ${role} by admin ${adminUserId}`);
    return updatedUser;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<User['preferences']>
  ): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.preferences = {
      ...user.preferences,
      ...preferences,
    };

    const updatedUser = await userRepository.update(user);
    await this.cacheUser(updatedUser);
    return updatedUser;
  }

  /**
   * Sign out - revoke current session
   */
  async signOut(userId: string, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const session = await sessionRepository.findByTokenHash(tokenHash);

    if (session) {
      await sessionRepository.delete(session.id);
    }

    logger.info(`User ${userId} signed out`);
  }

  /**
   * Sign out from all devices
   */
  async signOutAllDevices(userId: string): Promise<void> {
    await sessionRepository.deleteByUserId(userId);
    await redis.del(`user:${userId}`);
    logger.info(`User ${userId} signed out from all devices`);
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
   * Hash token for storage (don't store raw tokens)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Cache user in Redis
   */
  private async cacheUser(user: User): Promise<void> {
    try {
      await redis.set(
        `user:${user.id}`,
        JSON.stringify(user),
        'EX',
        config.cache.userSession
      );
    } catch (error) {
      logger.warn('Failed to cache user in Redis');
    }
  }

  /**
   * Parse device name from user agent
   */
  private parseDeviceName(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';

    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';

    return 'Unknown Device';
  }

  /**
   * Parse device type from user agent
   */
  private parseDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';

    if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
      return 'mobile';
    }
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return 'tablet';
    }
    return 'desktop';
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
  async signInAsGuest(deviceInfo?: DeviceInfo): Promise<LoginResponse> {
    const guestGoogleId = 'guest-user-google-id';

    let user = await userRepository.findByGoogleId(guestGoogleId);

    if (!user) {
      user = {
        id: uuidv4(),
        email: 'guest@petcheck.demo',
        name: 'Guest User',
        avatarUrl: undefined,
        role: 'pet_owner',
        googleId: guestGoogleId,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        preferences: { ...DEFAULT_USER_PREFERENCES },
        isActive: true,
      };
      user = await userRepository.create(user);
      logger.info('Guest user created');
    } else {
      user.lastLoginAt = new Date();
      user = await userRepository.update(user);
    }

    const token = this.generateToken(user);
    const expiresAt = this.getTokenExpiration();
    await this.createSession(user.id, token, expiresAt, deviceInfo);
    await this.cacheUser(user);

    logger.info('Guest user logged in');
    return { user, token, expiresAt };
  }

  /**
   * Cleanup expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const deleted = await sessionRepository.deleteExpired();
    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} expired sessions`);
    }
    return deleted;
  }
}

export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
