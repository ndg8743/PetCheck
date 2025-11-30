/**
 * PostgreSQL Database Service
 * Handles user persistence and multi-device sessions
 */

import { Pool, PoolClient } from 'pg';
import { config } from '../../config';
import { createLogger } from '../logger';
import {
  User,
  UserRole,
  DEFAULT_USER_PREFERENCES,
  Pet,
  SpeciesCategory,
} from '@petcheck/shared';

const logger = createLogger('database');

// Create connection pool
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: config.database.poolSize,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        role VARCHAR(50) NOT NULL DEFAULT 'pet_owner',
        google_id VARCHAR(255) UNIQUE NOT NULL,
        preferences JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create sessions table for multi-device support
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        device_name VARCHAR(255),
        device_type VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Create pets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pets (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        species VARCHAR(50) NOT NULL,
        breed VARCHAR(255),
        date_of_birth DATE,
        approximate_age JSONB,
        weight JSONB,
        gender VARCHAR(20),
        is_neutered BOOLEAN,
        microchip_id VARCHAR(100),
        profile_image_url TEXT,
        notes TEXT,
        veterinarian JSONB,
        medical_conditions JSONB DEFAULT '[]',
        allergies JSONB DEFAULT '[]',
        current_medications JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
      CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);
    `);

    await client.query('COMMIT');
    logger.info('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * User Repository
 */
export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  },

  async create(user: User): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (id, email, name, avatar_url, role, google_id, preferences, is_active, created_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        user.id,
        user.email,
        user.name,
        user.avatarUrl,
        user.role,
        user.googleId,
        JSON.stringify(user.preferences),
        user.isActive,
        user.createdAt,
        user.lastLoginAt,
      ]
    );
    return mapRowToUser(result.rows[0]);
  },

  async update(user: User): Promise<User> {
    const result = await pool.query(
      `UPDATE users SET
        email = $2,
        name = $3,
        avatar_url = $4,
        role = $5,
        preferences = $6,
        is_active = $7,
        last_login_at = $8
       WHERE id = $1
       RETURNING *`,
      [
        user.id,
        user.email,
        user.name,
        user.avatarUrl,
        user.role,
        JSON.stringify(user.preferences),
        user.isActive,
        user.lastLoginAt,
      ]
    );
    return mapRowToUser(result.rows[0]);
  },

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  },
};

/**
 * Session Repository - Multi-device support
 */
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

export const sessionRepository = {
  async create(session: Session): Promise<Session> {
    const result = await pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, device_name, device_type, ip_address, user_agent, created_at, last_active_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        session.id,
        session.userId,
        session.tokenHash,
        session.deviceName,
        session.deviceType,
        session.ipAddress,
        session.userAgent,
        session.createdAt,
        session.lastActiveAt,
        session.expiresAt,
      ]
    );
    return mapRowToSession(result.rows[0]);
  },

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const result = await pool.query(
      'SELECT * FROM sessions WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    return result.rows[0] ? mapRowToSession(result.rows[0]) : null;
  },

  async findByUserId(userId: string): Promise<Session[]> {
    const result = await pool.query(
      'SELECT * FROM sessions WHERE user_id = $1 AND expires_at > NOW() ORDER BY last_active_at DESC',
      [userId]
    );
    return result.rows.map(mapRowToSession);
  },

  async updateLastActive(id: string): Promise<void> {
    await pool.query(
      'UPDATE sessions SET last_active_at = NOW() WHERE id = $1',
      [id]
    );
  },

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
  },

  async deleteByUserId(userId: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  },

  async deleteExpired(): Promise<number> {
    const result = await pool.query(
      'DELETE FROM sessions WHERE expires_at < NOW()'
    );
    return result.rowCount || 0;
  },

  async countByUserId(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND expires_at > NOW()',
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  },
};

/**
 * Pet Repository - Pet data persistence
 */
export const petRepository = {
  async create(pet: Pet): Promise<Pet> {
    const result = await pool.query(
      `INSERT INTO pets (
        id, user_id, name, species, breed, date_of_birth, approximate_age,
        weight, gender, is_neutered, microchip_id, profile_image_url, notes,
        veterinarian, medical_conditions, allergies, current_medications,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        pet.id,
        pet.userId,
        pet.name,
        pet.species,
        pet.breed,
        pet.dateOfBirth,
        JSON.stringify(pet.approximateAge),
        JSON.stringify(pet.weight),
        pet.gender,
        pet.isNeutered,
        pet.microchipId,
        pet.profileImageUrl,
        pet.notes,
        JSON.stringify(pet.veterinarian),
        JSON.stringify(pet.medicalConditions),
        JSON.stringify(pet.allergies),
        JSON.stringify(pet.currentMedications),
        pet.isActive,
        pet.createdAt,
        pet.updatedAt,
      ]
    );
    return mapRowToPet(result.rows[0]);
  },

  async findById(id: string): Promise<Pet | null> {
    const result = await pool.query(
      'SELECT * FROM pets WHERE id = $1',
      [id]
    );
    return result.rows[0] ? mapRowToPet(result.rows[0]) : null;
  },

  async findByUserId(userId: string): Promise<Pet[]> {
    const result = await pool.query(
      'SELECT * FROM pets WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(mapRowToPet);
  },

  async update(pet: Pet): Promise<Pet> {
    const result = await pool.query(
      `UPDATE pets SET
        name = $2,
        breed = $3,
        date_of_birth = $4,
        approximate_age = $5,
        weight = $6,
        gender = $7,
        is_neutered = $8,
        microchip_id = $9,
        profile_image_url = $10,
        notes = $11,
        veterinarian = $12,
        medical_conditions = $13,
        allergies = $14,
        current_medications = $15,
        is_active = $16,
        updated_at = $17
      WHERE id = $1
      RETURNING *`,
      [
        pet.id,
        pet.name,
        pet.breed,
        pet.dateOfBirth,
        JSON.stringify(pet.approximateAge),
        JSON.stringify(pet.weight),
        pet.gender,
        pet.isNeutered,
        pet.microchipId,
        pet.profileImageUrl,
        pet.notes,
        JSON.stringify(pet.veterinarian),
        JSON.stringify(pet.medicalConditions),
        JSON.stringify(pet.allergies),
        JSON.stringify(pet.currentMedications),
        pet.isActive,
        pet.updatedAt,
      ]
    );
    return mapRowToPet(result.rows[0]);
  },

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM pets WHERE id = $1', [id]);
  },

  async softDelete(id: string): Promise<void> {
    await pool.query(
      'UPDATE pets SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
  },
};

/**
 * Map database row to Pet object
 */
function mapRowToPet(row: any): Pet {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    species: row.species as SpeciesCategory,
    breed: row.breed,
    dateOfBirth: row.date_of_birth?.toISOString().split('T')[0],
    approximateAge: row.approximate_age,
    weight: row.weight,
    gender: row.gender,
    isNeutered: row.is_neutered,
    microchipId: row.microchip_id,
    profileImageUrl: row.profile_image_url,
    notes: row.notes,
    veterinarian: row.veterinarian,
    medicalConditions: row.medical_conditions || [],
    allergies: row.allergies || [],
    currentMedications: row.current_medications || [],
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Map database row to User object
 */
function mapRowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role as UserRole,
    googleId: row.google_id,
    preferences: row.preferences || DEFAULT_USER_PREFERENCES,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    lastLoginAt: new Date(row.last_login_at || row.created_at),
  };
}

/**
 * Map database row to Session object
 */
function mapRowToSession(row: any): Session {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    deviceName: row.device_name,
    deviceType: row.device_type,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
    lastActiveAt: new Date(row.last_active_at),
    expiresAt: new Date(row.expires_at),
  };
}

/**
 * Health check
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Graceful shutdown
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info('Database connection pool closed');
}

export { pool };
export default pool;
