/**
 * String normalization utilities for drug names and search
 */

/**
 * Normalize a drug name for consistent matching
 */
export function normalizeDrugName(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\s+(tablets?|capsules?|injection|solution|suspension|gel|cream|ointment|spray|drops?|powder|liquid|chewables?|paste|topical)$/i, '')
    // Remove strength/dosage info
    .replace(/\s+\d+(\.\d+)?\s*(mg|ml|mcg|g|%|iu)(\s*\/\s*\d+(\.\d+)?\s*(mg|ml|mcg|g|%|iu))?/gi, '')
    // Remove trademark symbols
    .replace(/[®™©]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove parenthetical info
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim();
}

/**
 * Normalize a species name for consistent matching
 */
export function normalizeSpeciesName(name: string): string {
  if (!name) return '';

  const normalized = name.toLowerCase().trim();

  // Common mappings
  const mappings: Record<string, string> = {
    'dogs': 'dog',
    'canines': 'canine',
    'cats': 'cat',
    'felines': 'feline',
    'horses': 'horse',
    'equines': 'equine',
    'cattle': 'cattle',
    'cows': 'cattle',
    'cow': 'cattle',
    'bovines': 'bovine',
    'pigs': 'pig',
    'swine': 'pig',
    'hogs': 'pig',
    'hog': 'pig',
    'sheep': 'sheep',
    'lambs': 'sheep',
    'lamb': 'sheep',
    'goats': 'goat',
    'birds': 'bird',
    'poultry': 'bird',
    'chickens': 'bird',
    'chicken': 'bird',
    'turkeys': 'bird',
    'turkey': 'bird',
    'rabbits': 'rabbit',
    'bunnies': 'rabbit',
    'bunny': 'rabbit',
    'rodents': 'rodent',
    'mice': 'rodent',
    'mouse': 'rodent',
    'rats': 'rodent',
    'rat': 'rodent',
    'hamsters': 'rodent',
    'hamster': 'rodent',
    'guinea pigs': 'rodent',
    'guinea pig': 'rodent',
    'fish': 'fish',
    'fishes': 'fish',
    'reptiles': 'reptile',
    'snakes': 'reptile',
    'snake': 'reptile',
    'lizards': 'reptile',
    'lizard': 'reptile',
    'turtles': 'reptile',
    'turtle': 'reptile',
    'ferrets': 'ferret',
    'ferret': 'ferret'
  };

  return mappings[normalized] || normalized;
}

/**
 * Create a cache key from search parameters
 */
export function createCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params).sort();
  const normalizedParams = sortedKeys
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => {
      let value = params[key];
      if (typeof value === 'string') {
        value = value.toLowerCase().trim();
      } else if (Array.isArray(value)) {
        value = [...value].sort().join(',');
      }
      return `${key}:${value}`;
    })
    .join('|');

  return `${prefix}:${normalizedParams}`;
}

/**
 * Generate a search-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse a date string in various formats
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try YYYYMMDD format (openFDA)
  if (/^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }

  // Try ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  return null;
}

/**
 * Format a date to YYYYMMDD for openFDA queries
 */
export function formatDateForOpenFda(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Escape special characters for openFDA search queries
 */
export function escapeOpenFdaQuery(query: string): string {
  // OpenFDA uses Elasticsearch, escape special chars
  return query.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&');
}

/**
 * Build an openFDA search query string
 */
export function buildOpenFdaSearchQuery(
  params: Record<string, string | string[] | undefined>
): string {
  const parts: string[] = [];

  for (const [field, value] of Object.entries(params)) {
    if (!value) continue;

    if (Array.isArray(value)) {
      if (value.length > 0) {
        const escaped = value.map(v => escapeOpenFdaQuery(v));
        parts.push(`${field}:(${escaped.join('+OR+')})`);
      }
    } else {
      parts.push(`${field}:"${escapeOpenFdaQuery(value)}"`);
    }
  }

  return parts.join('+AND+');
}
