/**
 * Autocomplete helpers — thin wrappers around /api/drugs/suggest with a
 * tiny in-memory LRU so we don't re-hit the network for the same query
 * within a session.
 */

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3001/api';

const cache = new Map<string, string[]>();
const CACHE_LIMIT = 50;

function rememberInCache(key: string, value: string[]): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, value);
}

export async function fetchDrugSuggestions(query: string, limit = 8): Promise<string[]> {
  const trimmed = query.trim();
  const cacheKey = `${trimmed.toLowerCase()}|${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams();
  if (trimmed) params.set('q', trimmed);
  params.set('limit', String(limit));

  try {
    const res = await fetch(`${API_BASE}/drugs/suggest?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    const list: string[] = Array.isArray(json?.data?.suggestions) ? json.data.suggestions : [];
    rememberInCache(cacheKey, list);
    return list;
  } catch {
    return [];
  }
}
