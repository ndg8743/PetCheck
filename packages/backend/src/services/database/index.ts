/**
 * PostgreSQL Database Service
 * Handles user persistence and multi-device sessions
 * Falls back to in-memory storage when DATABASE_URL is empty
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
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('database');

// Track if we're using in-memory fallback
let useInMemoryDb = false;
let dbInitWarningLogged = false;

// In-memory storage
const inMemoryUsers = new Map<string, any>();
const inMemorySessions = new Map<string, any>();
const inMemoryPets = new Map<string, any>();
const inMemoryWeightLogs = new Map<string, any>();

// Create connection pool
let pool: Pool | null = null;

// Initialize database connection
async function initializeConnection(): Promise<void> {
  // Check if DATABASE_URL is provided
  const databaseUrl = process.env.DATABASE_URL;
  const hasEnvVars = config.database.host && config.database.user;

  if (!databaseUrl && !hasEnvVars) {
    if (!dbInitWarningLogged) {
      logger.warn('DATABASE_URL not set - using in-memory database (data will not persist across restarts)');
      dbInitWarningLogged = true;
    }
    useInMemoryDb = true;
    return;
  }

  try {
    pool = new Pool({
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

    // Test connection
    const client = await pool.connect();
    client.release();
    logger.info('Database connection pool initialized');
  } catch (error) {
    if (!dbInitWarningLogged) {
      logger.warn('Failed to connect to PostgreSQL - using in-memory database:', error);
      dbInitWarningLogged = true;
    }
    useInMemoryDb = true;
    pool = null;
  }
}

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<void> {
  await initializeConnection();

  if (useInMemoryDb) {
    logger.info('Database: using in-memory storage');
    return;
  }

  if (!pool) {
    logger.warn('Database pool not available, using in-memory storage');
    useInMemoryDb = true;
    return;
  }

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

    // Pet weight logs (Feature G — Weight history sparkline)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pet_weight_logs (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        value NUMERIC(8,3) NOT NULL,
        unit VARCHAR(8) NOT NULL DEFAULT 'lb',
        recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
      CREATE INDEX IF NOT EXISTS idx_pet_weight_logs_pet_id ON pet_weight_logs(pet_id, recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pet_weight_logs_user_id ON pet_weight_logs(user_id);
    `);

    await client.query('COMMIT');
    logger.info('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize database schema:', error);
    // Don't throw - allow server to continue with in-memory db
    useInMemoryDb = true;
  } finally {
    client.release();
  }
}

/**
 * User Repository
 */
export const userRepository = {
  async findById(id: string): Promise<User | null> {
    if (useInMemoryDb) {
      return inMemoryUsers.get(id) || null;
    }

    if (!pool) return null;
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
    } catch (err) {
      logger.error('Database error:', err);
      return null;
    }
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    if (useInMemoryDb) {
      for (const user of inMemoryUsers.values()) {
        if (user.googleId === googleId) return user;
      }
      return null;
    }

    if (!pool) return null;
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );
      return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
    } catch (err) {
      logger.error('Database error:', err);
      return null;
    }
  },

  async findByEmail(email: string): Promise<User | null> {
    if (useInMemoryDb) {
      for (const user of inMemoryUsers.values()) {
        if (user.email === email) return user;
      }
      return null;
    }

    if (!pool) return null;
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
    } catch (err) {
      logger.error('Database error:', err);
      return null;
    }
  },

  async create(user: User): Promise<User> {
    if (useInMemoryDb) {
      inMemoryUsers.set(user.id, user);
      return user;
    }

    if (!pool) throw new Error('Database not available');
    try {
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
    } catch (err) {
      logger.error('Database error:', err);
      throw err;
    }
  },

  async update(user: User): Promise<User> {
    if (useInMemoryDb) {
      inMemoryUsers.set(user.id, user);
      return user;
    }

    if (!pool) throw new Error('Database not available');
    try {
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
    } catch (err) {
      logger.error('Database error:', err);
      throw err;
    }
  },

  async delete(id: string): Promise<void> {
    if (useInMemoryDb) {
      inMemoryUsers.delete(id);
      return;
    }

    if (!pool) return;
    try {
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
    } catch (err) {
      logger.error('Database error:', err);
    }
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
    if (useInMemoryDb) {
      inMemorySessions.set(session.id, session);
      return session;
    }

    if (!pool) throw new Error('Database not available');
    try {
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
    } catch (err) {
      logger.error('Database error:', err);
      throw err;
    }
  },

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    if (useInMemoryDb) {
      for (const session of inMemorySessions.values()) {
        if (session.tokenHash === tokenHash && session.expiresAt > new Date()) {
          return session;
        }
      }
      return null;
    }

    if (!pool) return null;
    try {
      const result = await pool.query(
        'SELECT * FROM sessions WHERE token_hash = $1 AND expires_at > NOW()',
        [tokenHash]
      );
      return result.rows[0] ? mapRowToSession(result.rows[0]) : null;
    } catch (err) {
      logger.error('Database error:', err);
      return null;
    }
  },

  async findByUserId(userId: string): Promise<Session[]> {
    if (useInMemoryDb) {
      const result = [];
      for (const session of inMemorySessions.values()) {
        if (session.userId === userId && session.expiresAt > new Date()) {
          result.push(session);
        }
      }
      return result.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
    }

    if (!pool) return [];
    try {
      const result = await pool.query(
        'SELECT * FROM sessions WHERE user_id = $1 AND expires_at > NOW() ORDER BY last_active_at DESC',
        [userId]
      );
      return result.rows.map(mapRowToSession);
    } catch (err) {
      logger.error('Database error:', err);
      return [];
    }
  },

  async updateLastActive(id: string): Promise<void> {
    if (useInMemoryDb) {
      const session = inMemorySessions.get(id);
      if (session) {
        session.lastActiveAt = new Date();
      }
      return;
    }

    if (!pool) return;
    try {
      await pool.query(
        'UPDATE sessions SET last_active_at = NOW() WHERE id = $1',
        [id]
      );
    } catch (err) {
      logger.error('Database error:', err);
    }
  },

  async delete(id: string): Promise<void> {
    if (useInMemoryDb) {
      inMemorySessions.delete(id);
      return;
    }

    if (!pool) return;
    try {
      await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    } catch (err) {
      logger.error('Database error:', err);
    }
  },

  async deleteByUserId(userId: string): Promise<void> {
    if (useInMemoryDb) {
      for (const [id, session] of inMemorySessions.entries()) {
        if (session.userId === userId) {
          inMemorySessions.delete(id);
        }
      }
      return;
    }

    if (!pool) return;
    try {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    } catch (err) {
      logger.error('Database error:', err);
    }
  },

  async deleteExpired(): Promise<number> {
    if (useInMemoryDb) {
      let count = 0;
      for (const [id, session] of inMemorySessions.entries()) {
        if (session.expiresAt < new Date()) {
          inMemorySessions.delete(id);
          count++;
        }
      }
      return count;
    }

    if (!pool) return 0;
    try {
      const result = await pool.query(
        'DELETE FROM sessions WHERE expires_at < NOW()'
      );
      return result.rowCount || 0;
    } catch (err) {
      logger.error('Database error:', err);
      return 0;
    }
  },

  async countByUserId(userId: string): Promise<number> {
    if (useInMemoryDb) {
      let count = 0;
      for (const session of inMemorySessions.values()) {
        if (session.userId === userId && session.expiresAt > new Date()) {
          count++;
        }
      }
      return count;
    }

    if (!pool) return 0;
    try {
      const result = await pool.query(
        'SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND expires_at > NOW()',
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (err) {
      logger.error('Database error:', err);
      return 0;
    }
  },
};

/**
 * Pet Repository - Pet data persistence
 */
export const petRepository = {
  async create(pet: Pet): Promise<Pet> {
    if (useInMemoryDb) {
      inMemoryPets.set(pet.id, pet);
      return pet;
    }

    if (!pool) throw new Error('Database not available');
    try {
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
    } catch (err) {
      logger.error('Database error:', err);
      throw err;
    }
  },

  async findById(id: string): Promise<Pet | null> {
    if (useInMemoryDb) {
      return inMemoryPets.get(id) || null;
    }

    if (!pool) return null;
    try {
      const result = await pool.query(
        'SELECT * FROM pets WHERE id = $1',
        [id]
      );
      return result.rows[0] ? mapRowToPet(result.rows[0]) : null;
    } catch (err) {
      logger.error('Database error:', err);
      return null;
    }
  },

  async findByUserId(userId: string): Promise<Pet[]> {
    if (useInMemoryDb) {
      const result = [];
      for (const pet of inMemoryPets.values()) {
        if (pet.userId === userId && pet.isActive) {
          result.push(pet);
        }
      }
      return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    if (!pool) return [];
    try {
      const result = await pool.query(
        'SELECT * FROM pets WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
        [userId]
      );
      return result.rows.map(mapRowToPet);
    } catch (err) {
      logger.error('Database error:', err);
      return [];
    }
  },

  async update(pet: Pet): Promise<Pet> {
    if (useInMemoryDb) {
      inMemoryPets.set(pet.id, pet);
      return pet;
    }

    if (!pool) throw new Error('Database not available');
    try {
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
    } catch (err) {
      logger.error('Database error:', err);
      throw err;
    }
  },

  async delete(id: string): Promise<void> {
    if (useInMemoryDb) {
      inMemoryPets.delete(id);
      return;
    }

    if (!pool) return;
    try {
      await pool.query('DELETE FROM pets WHERE id = $1', [id]);
    } catch (err) {
      logger.error('Database error:', err);
    }
  },

  async softDelete(id: string): Promise<void> {
    if (useInMemoryDb) {
      const pet = inMemoryPets.get(id);
      if (pet) {
        pet.isActive = false;
        pet.updatedAt = new Date();
      }
      return;
    }

    if (!pool) return;
    try {
      await pool.query(
        'UPDATE pets SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );
    } catch (err) {
      logger.error('Database error:', err);
    }
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
  if (useInMemoryDb) {
    return true; // In-memory DB is always healthy
  }

  if (!pool) return false;
  try {
    const result = await pool.query('SELECT 1');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// Pet Weight Logs Repository (Feature G)
// ============================================================================
export interface PetWeightLog {
  id: string;
  userId: string;
  petId: string;
  value: number;
  unit: 'kg' | 'lb';
  recordedAt: Date;
  notes?: string;
  createdAt: Date;
}

function mapRowToWeightLog(row: any): PetWeightLog {
  return {
    id: row.id,
    userId: row.user_id,
    petId: row.pet_id,
    value: typeof row.value === 'string' ? parseFloat(row.value) : row.value,
    unit: row.unit,
    recordedAt: row.recorded_at instanceof Date ? row.recorded_at : new Date(row.recorded_at),
    notes: row.notes ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
  };
}

export const petWeightLogRepository = {
  async create(log: PetWeightLog): Promise<PetWeightLog> {
    if (useInMemoryDb) {
      inMemoryWeightLogs.set(log.id, log);
      return log;
    }
    if (!pool) throw new Error('Database not available');
    try {
      const result = await pool.query(
        `INSERT INTO pet_weight_logs (id, user_id, pet_id, value, unit, recorded_at, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [log.id, log.userId, log.petId, log.value, log.unit, log.recordedAt, log.notes ?? null, log.createdAt]
      );
      return mapRowToWeightLog(result.rows[0]);
    } catch (err) {
      logger.error('Weight log create error:', err);
      throw err;
    }
  },

  async findByPetId(petId: string): Promise<PetWeightLog[]> {
    if (useInMemoryDb) {
      const all: PetWeightLog[] = [];
      for (const log of inMemoryWeightLogs.values()) {
        if (log.petId === petId) all.push(log);
      }
      return all.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
    }
    if (!pool) return [];
    try {
      const result = await pool.query(
        'SELECT * FROM pet_weight_logs WHERE pet_id = $1 ORDER BY recorded_at ASC',
        [petId]
      );
      return result.rows.map(mapRowToWeightLog);
    } catch (err) {
      logger.error('Weight log find error:', err);
      return [];
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    if (useInMemoryDb) {
      const existing = inMemoryWeightLogs.get(id);
      if (!existing || existing.userId !== userId) return false;
      inMemoryWeightLogs.delete(id);
      return true;
    }
    if (!pool) return false;
    try {
      const result = await pool.query(
        'DELETE FROM pet_weight_logs WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      logger.error('Weight log delete error:', err);
      return false;
    }
  },
};

/**
 * Graceful shutdown
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database connection pool closed');
  } else {
    logger.debug('No database pool to close');
  }
}

export { pool };
export default pool;
