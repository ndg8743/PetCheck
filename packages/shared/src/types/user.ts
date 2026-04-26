/**
 * User and authentication types
 */

export type UserRole = 'pet_owner' | 'veterinarian' | 'researcher' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  googleId: string;
  createdAt: Date;
  lastLoginAt: Date;
  preferences: UserPreferences;
  isActive: boolean;
  isGuest?: boolean;
}

export const GUEST_GOOGLE_ID = 'guest-user-google-id';

export interface UserPreferences {
  defaultSpecies?: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  locale?: string;
  measurementSystem: 'metric' | 'imperial';
}

export interface NotificationPreferences {
  recallAlerts: boolean;
  safetyAlerts: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  isGuest?: boolean;
  iat: number;
  exp: number;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface GoogleAuthPayload {
  credential: string;
  clientId: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  notifications: {
    recallAlerts: true,
    safetyAlerts: true,
    emailNotifications: false,
    pushNotifications: true
  },
  measurementSystem: 'imperial'
};

export function canAccessResearchFeatures(role: UserRole): boolean {
  return role === 'veterinarian' || role === 'researcher' || role === 'admin';
}

export function canExportData(role: UserRole): boolean {
  return role === 'veterinarian' || role === 'researcher' || role === 'admin';
}

export function canAccessAdminFeatures(role: UserRole): boolean {
  return role === 'admin';
}
