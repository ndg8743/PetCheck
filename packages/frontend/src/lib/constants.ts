// API Constants
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// App Constants
export const APP_NAME = 'PetCheck';
export const APP_DESCRIPTION = 'FDA Animal Drug Safety Explorer';

// Query Keys
export const QUERY_KEYS = {
  DRUGS: 'drugs',
  ADVERSE_EVENTS: 'adverse-events',
  RECALLS: 'recalls',
  PETS: 'pets',
  VETS: 'vets',
  FAVORITES: 'favorites',
  USER: 'user',
} as const;

// Pet Species
export const PET_SPECIES = {
  DOG: 'dog',
  CAT: 'cat',
  HORSE: 'horse',
  BIRD: 'bird',
  REPTILE: 'reptile',
  OTHER: 'other',
} as const;

// User Roles
export const USER_ROLES = {
  PET_OWNER: 'pet_owner',
  RESEARCHER: 'researcher',
  VETERINARIAN: 'veterinarian',
  ADMIN: 'admin',
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE = 1;

// Cache Times (in milliseconds)
export const CACHE_TIME = {
  SHORT: 1000 * 60 * 5, // 5 minutes
  MEDIUM: 1000 * 60 * 30, // 30 minutes
  LONG: 1000 * 60 * 60 * 24, // 24 hours
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  DRUGS: '/drugs',
  DRUG_DETAIL: (id: string) => `/drugs/${id}`,
  MY_PETS: '/my-pets',
  PET_DETAIL: (id: string) => `/my-pets/${id}`,
  ADVERSE_EVENTS: '/adverse-events',
  RECALLS: '/recalls',
  INTERACTION_CHECKER: '/interaction-checker',
  VET_SEARCH: '/find-vet',
  PROFILE: '/profile',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
  THEME: 'theme',
} as const;

// Severity Levels
export const SEVERITY_LEVELS = {
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe',
  LIFE_THREATENING: 'life_threatening',
} as const;

// Recall Status
export const RECALL_STATUS = {
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  TERMINATED: 'terminated',
} as const;
