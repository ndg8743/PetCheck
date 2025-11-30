/**
 * Secure Storage Utility
 * Provides encrypted/obfuscated storage for sensitive data
 */

// Simple obfuscation key - in production, this could be derived from user session
const STORAGE_KEY = 'petcheck_v1';

/**
 * Base64 encode with simple XOR obfuscation
 * This isn't true encryption but prevents casual inspection
 */
function obfuscate(data: string): string {
  try {
    const encoded = btoa(
      data
        .split('')
        .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ STORAGE_KEY.charCodeAt(i % STORAGE_KEY.length)))
        .join('')
    );
    return encoded;
  } catch {
    return btoa(data);
  }
}

/**
 * Decode obfuscated data
 */
function deobfuscate(data: string): string {
  try {
    const decoded = atob(data);
    return decoded
      .split('')
      .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ STORAGE_KEY.charCodeAt(i % STORAGE_KEY.length)))
      .join('');
  } catch {
    try {
      return atob(data);
    } catch {
      return data;
    }
  }
}

/**
 * Secure storage for sensitive data like auth tokens
 */
export const secureStorage = {
  /**
   * Store a value securely
   */
  setItem(key: string, value: string): void {
    try {
      const obfuscated = obfuscate(value);
      localStorage.setItem(`_s_${key}`, obfuscated);
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
    }
  },

  /**
   * Retrieve a securely stored value
   */
  getItem(key: string): string | null {
    try {
      const stored = localStorage.getItem(`_s_${key}`);
      if (!stored) return null;
      return deobfuscate(stored);
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  },

  /**
   * Remove a securely stored value
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(`_s_${key}`);
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
    }
  },

  /**
   * Clear all secure storage items
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('_s_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('SecureStorage clear error:', error);
    }
  },
};

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export default secureStorage;
