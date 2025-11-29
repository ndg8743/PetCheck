import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Format date to short string
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Format species name
 */
export function formatSpecies(species: string): string {
  return species
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Get severity color class
 */
export function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'mild':
      return 'text-secondary-700 bg-secondary-100';
    case 'moderate':
      return 'text-yellow-700 bg-yellow-100';
    case 'severe':
      return 'text-orange-700 bg-orange-100';
    case 'life_threatening':
      return 'text-accent-700 bg-accent-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

/**
 * Get recall status color class
 */
export function getRecallStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'ongoing':
      return 'text-accent-700 bg-accent-100';
    case 'completed':
      return 'text-secondary-700 bg-secondary-100';
    case 'terminated':
      return 'text-gray-700 bg-gray-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep function for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): string {
  if (total === 0) return '0';
  return ((value / total) * 100).toFixed(1);
}
