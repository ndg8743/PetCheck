/**
 * Display helpers for pet records.
 * Defensive against bad/old data already in the DB (literal "null", "Null",
 * "undefined", whitespace) until the form-side validation catches up.
 */

const NULLISH_LITERALS = new Set(['null', 'undefined', 'none', 'na', 'n/a', '']);

export function normalizeBreed(breed: unknown): string {
  if (breed == null) return 'Unknown breed';
  if (typeof breed !== 'string') return 'Unknown breed';
  const trimmed = breed.trim();
  if (NULLISH_LITERALS.has(trimmed.toLowerCase())) return 'Unknown breed';
  return trimmed;
}
