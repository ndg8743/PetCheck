/**
 * Green Book Service
 * FDA's database of approved animal drug products
 * Fetches real data from openFDA animalandveterinary/event.json endpoint
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../logger';
import { getFromCache, setInCache } from '../redis';
import { config } from '../../config';
import {
  Drug,
  DrugSearchParams,
  DrugSearchResult,
  ActiveIngredient,
  DrugClass,
  DrugType,
  AdministrationRoute,
  SpeciesCategory,
  createCacheKey,
  normalizeDrugName,
} from '@petcheck/shared';
import { v4 as uuidv4 } from 'uuid';
import { PET_BRAND_ALIASES } from './brand-aliases';

const logger = createLogger('green-book');

// Cache file location
const CACHE_FILE = '/tmp/petcheck-drugs.json';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Local drug cache populated from openFDA
let drugDatabase: Map<string, Drug> = new Map();
let drugsByIngredient: Map<string, string[]> = new Map();
let initialized = false;

// In-memory popularity tracker. Process-local — fine for single-pod deploys;
// swap for a Redis sorted set if we ever horizontally scale the backend.
const searchPopularity: Map<string, number> = new Map();

// Curated brand-name seed used when nothing has been searched yet, so the
// empty-query suggestion list isn't empty on a fresh container.
const POPULAR_DRUG_SEEDS: string[] = [
  'Apoquel',
  'Bravecto',
  'NexGard',
  'Heartgard',
  'Frontline',
  'Trifexis',
  'Cerenia',
  'Rimadyl',
  'Carprofen',
  'Metacam',
];

// Helper function to infer drug class from name
function inferDrugClass(drugName: string, genericName?: string): DrugClass[] {
  const name = (drugName + ' ' + (genericName || '')).toLowerCase();
  const classes: Set<DrugClass> = new Set();

  if (name.includes('amoxi') || name.includes('amoxicillin') || name.includes('penicillin') || 
      name.includes('cephalosporin') || name.includes('tetracycline')) {
    classes.add('antibiotic');
  }
  if (name.includes('ivermectin') || name.includes('pyrantel') || name.includes('fenbendazole') ||
      name.includes('praziquantel') || name.includes('selamectin')) {
    classes.add('antiparasitic');
  }
  if (name.includes('carprofen') || name.includes('meloxicam') || name.includes('nsaid') ||
      name.includes('ibuprofen') || name.includes('aspirin')) {
    classes.add('nsaid');
  }
  if (name.includes('prednisone') || name.includes('dexamethasone') || name.includes('methylprednisolone')) {
    classes.add('corticosteroid');
  }
  if (name.includes('spot-on') || name.includes('topical') || name.includes('shampoo') ||
      name.includes('ointment') || name.includes('cream')) {
    classes.add('antiparasitic');
  }

  return classes.size > 0 ? Array.from(classes) : ['unknown'];
}

// Helper function to infer routes from drug name
function inferRoutes(drugName: string): AdministrationRoute[] {
  const name = drugName.toLowerCase();
  const routes: Set<AdministrationRoute> = new Set();

  if (name.includes('spot-on') || name.includes('topical') || name.includes('shampoo') ||
      name.includes('ointment') || name.includes('cream') || name.includes('lotion')) {
    routes.add('topical');
  }
  if (name.includes('injection') || name.includes('injectable') || name.includes('intravenous') ||
      name.includes('subcutaneous')) {
    routes.add('injectable');
  }
  if (name.includes('tablet') || name.includes('capsule') || name.includes('chewable') ||
      name.includes('oral') || name.includes('suspension') || name.includes('liquid')) {
    routes.add('oral');
  }
  if (name.includes('eye') || name.includes('ophthalmic')) {
    routes.add('ophthalmic');
  }
  if (name.includes('ear') || name.includes('otic')) {
    routes.add('otic');
  }

  return routes.size > 0 ? Array.from(routes) : ['oral'];
}

// Helper function to infer approved species
function inferSpecies(drugName: string): SpeciesCategory[] {
  const name = drugName.toLowerCase();
  const species: Set<SpeciesCategory> = new Set();

  // Default to both if not specified
  species.add('canine');
  species.add('feline');

  return Array.from(species);
}

// Parse openFDA response to Drug objects
function parseDrugs(activeIngredients: any[], brandNames: any[]): Drug[] {
  const drugs: Drug[] = [];
  const seen = new Set<string>();

  // Add drugs from active ingredients
  if (activeIngredients && Array.isArray(activeIngredients)) {
    for (const item of activeIngredients.slice(0, 500)) {
      if (!item.term) continue;
      const ingredientName = item.term.trim();
      if (seen.has(ingredientName.toLowerCase())) continue;
      seen.add(ingredientName.toLowerCase());

      const drug: Drug = {
        id: `openfda-ingredient-${uuidv4()}`,
        tradeName: ingredientName,
        genericName: ingredientName,
        activeIngredients: [{ name: ingredientName }],
        drugClass: inferDrugClass(ingredientName),
        drugType: 'prescription',
        routes: inferRoutes(ingredientName),
        approvedSpecies: inferSpecies(ingredientName),
        source: 'openfda',
        lastUpdated: new Date(),
        totalReports: item.count || 0,
      };
      drugs.push(drug);
    }
  }

  // Add drugs from brand names
  if (brandNames && Array.isArray(brandNames)) {
    for (const item of brandNames.slice(0, 500)) {
      if (!item.term) continue;
      const brandName = item.term.trim();
      if (seen.has(brandName.toLowerCase())) continue;
      seen.add(brandName.toLowerCase());

      const drug: Drug = {
        id: `openfda-brand-${uuidv4()}`,
        tradeName: brandName,
        activeIngredients: [],
        drugClass: inferDrugClass(brandName),
        drugType: 'prescription',
        routes: inferRoutes(brandName),
        approvedSpecies: inferSpecies(brandName),
        source: 'openfda',
        lastUpdated: new Date(),
        totalReports: item.count || 0,
      };
      drugs.push(drug);
    }
  }

// Add curated pet-medication brand-name aliases (openFDA's brand_name aggregation
  // returns essentially nothing useful, so we hand-curate the most common pet meds)
  for (const alias of PET_BRAND_ALIASES) {
    const key = alias.brand.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    drugs.push({
      id: `pet-brand-${alias.brand.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      tradeName: alias.brand,
      genericName: alias.generic,
      activeIngredients: alias.ingredients.map((n) => ({ name: n })),
      drugClass: alias.drugClass as DrugClass[],
      drugType: 'prescription',
      routes: alias.routes as AdministrationRoute[],
      approvedSpecies: alias.species as SpeciesCategory[],
      manufacturer: alias.manufacturer,
      indications: alias.indications,
      source: 'manual',
      lastUpdated: new Date(),
      totalReports: 0,
    });
  }

  return drugs;
}

// Fetch drugs from openFDA
async function fetchFromOpenFDA(): Promise<Drug[]> {
  try {
    logger.info('Fetching drug data from openFDA...');

    // Fetch active ingredients
    const ingredientsUrl = `${config.openFda.baseUrl}/animalandveterinary/event.json?count=drug.active_ingredients.name.exact&limit=1000`;
    const ingredientsResponse = await axios.get(ingredientsUrl, {
      timeout: config.openFda.timeout,
      params: config.openFda.apiKey ? { api_key: config.openFda.apiKey } : {},
    });

    // Fetch brand names
    const brandsUrl = `${config.openFda.baseUrl}/animalandveterinary/event.json?count=drug.brand_name.exact&limit=1000`;
    const brandsResponse = await axios.get(brandsUrl, {
      timeout: config.openFda.timeout,
      params: config.openFda.apiKey ? { api_key: config.openFda.apiKey } : {},
    });

    const activeIngredients = ingredientsResponse.data?.results || [];
    const brandNames = brandsResponse.data?.results || [];

    logger.info(`Fetched ${activeIngredients.length} active ingredients and ${brandNames.length} brand names from openFDA`);

    return parseDrugs(activeIngredients, brandNames);
  } catch (error) {
    logger.error('Failed to fetch from openFDA:', error);
    throw error;
  }
}

// Load drugs from cache file if fresh
function loadFromCacheFile(): Drug[] | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }

    const stats = fs.statSync(CACHE_FILE);
    const age = Date.now() - stats.mtimeMs;

    if (age > CACHE_MAX_AGE_MS) {
      logger.info('Drug cache file is stale (> 7 days)');
      return null;
    }

    const data = fs.readFileSync(CACHE_FILE, 'utf-8');
    const drugs = JSON.parse(data) as Drug[];
    logger.info(`Loaded ${drugs.length} drugs from cache file`);
    return drugs;
  } catch (error) {
    logger.warn('Failed to load from cache file:', error);
    return null;
  }
}

// Save drugs to cache file
function saveToCacheFile(drugs: Drug[]): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(drugs, null, 2));
    logger.info(`Saved ${drugs.length} drugs to cache file`);
  } catch (error) {
    logger.warn('Failed to save to cache file:', error);
  }
}

export class GreenBookService {
  /**
   * Initialize the Green Book service
   */
  async initialize(): Promise<void> {
    if (initialized) return;

    const cacheKey = 'greenbook:drugs';
    const cached = await getFromCache<Drug[]>(cacheKey);

    if (cached && !cached.stale) {
      this.loadDrugsIntoMemory(cached.data);
      initialized = true;
      logger.info(`Loaded ${drugDatabase.size} drugs from Redis cache`);
      return;
    }

    // Try to load from file or fetch from openFDA
    let drugs: Drug[] | null = loadFromCacheFile();

    if (!drugs) {
      try {
        drugs = await fetchFromOpenFDA();
        saveToCacheFile(drugs);
      } catch (error) {
        logger.warn('Failed to fetch from openFDA, using sample data:', error);
        drugs = this.getSampleDrugData();
        logger.info('[fallback] Using sample drug data instead of openFDA');
      }
    }

    this.loadDrugsIntoMemory(drugs);

    // Cache in Redis for fast access
    await setInCache(cacheKey, drugs, {
      ttl: config.cache.greenBook,
      staleTtl: config.cache.greenBook,
    });

    initialized = true;
    logger.info(`Initialized Green Book with ${drugDatabase.size} drugs`);
  }

  /**
   * Load drugs into memory for fast lookup
   */
  private loadDrugsIntoMemory(drugs: Drug[]): void {
    drugDatabase.clear();
    drugsByIngredient.clear();

    for (const drug of drugs) {
      drugDatabase.set(drug.id, drug);

      // Index by normalized name
      const normalizedName = normalizeDrugName(drug.tradeName);
      drugDatabase.set(`name:${normalizedName}`, drug);

      if (drug.genericName) {
        drugDatabase.set(`name:${normalizeDrugName(drug.genericName)}`, drug);
      }

      // Index by active ingredients
      for (const ingredient of drug.activeIngredients) {
        const normalizedIngredient = normalizeDrugName(ingredient.name);
        const existing = drugsByIngredient.get(normalizedIngredient) || [];
        existing.push(drug.id);
        drugsByIngredient.set(normalizedIngredient, existing);
      }
    }
  }

  /**
   * Search drugs in the Green Book
   */
  async search(params: DrugSearchParams): Promise<DrugSearchResult> {
    await this.initialize();

    const cacheKey = createCacheKey('greenbook:search', params);
    const cached = await getFromCache<DrugSearchResult>(cacheKey);

    if (cached && !cached.stale) {
      return cached.data;
    }

    // Get unique drugs by ID (avoid duplicates from name-indexed entries)
    const uniqueDrugs = new Map<string, Drug>();
    for (const drug of drugDatabase.values()) {
      if (drug.id && !uniqueDrugs.has(drug.id)) {
        uniqueDrugs.set(drug.id, drug);
      }
    }
    let results = Array.from(uniqueDrugs.values());

    // Apply filters
    if (params.query) {
      const query = params.query.toLowerCase();
      results = results.filter(
        (d) =>
          d.tradeName.toLowerCase().includes(query) ||
          d.genericName?.toLowerCase().includes(query) ||
          d.activeIngredients.some((i) => i.name.toLowerCase().includes(query))
      );
    }

    if (params.species && params.species.length > 0) {
      results = results.filter((d) =>
        d.approvedSpecies.some((s) => params.species!.includes(s))
      );
    }

    if (params.drugClass && params.drugClass.length > 0) {
      results = results.filter((d) =>
        d.drugClass.some((c) => params.drugClass!.includes(c))
      );
    }

    if (params.route && params.route.length > 0) {
      results = results.filter((d) =>
        d.routes.some((r) => params.route!.includes(r))
      );
    }

    if (params.drugType) {
      results = results.filter((d) => d.drugType === params.drugType);
    }

    if (params.manufacturer) {
      const mfr = params.manufacturer.toLowerCase();
      results = results.filter((d) =>
        d.manufacturer?.toLowerCase().includes(mfr)
      );
    }

    if (!params.includeDiscontinued) {
      results = results.filter((d) => !d.isDiscontinued);
    }

    // Sort by relevance (trade name match first)
    if (params.query) {
      const query = params.query.toLowerCase();
      results.sort((a, b) => {
        const aExact = a.tradeName.toLowerCase() === query ? 0 : 1;
        const bExact = b.tradeName.toLowerCase() === query ? 0 : 1;
        return aExact - bExact;
      });
    }

    const total = results.length;
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    const paginatedResults = results.slice(offset, offset + limit);

    const result: DrugSearchResult = {
      drugs: paginatedResults,
      total,
      limit,
      offset,
      query: params,
    };

    // Cache results
    await setInCache(cacheKey, result, {
      ttl: config.cache.drugs,
      staleTtl: config.cache.drugsStale,
    });

    return result;
  }

  /**
   * Get a drug by ID
   */
  async getDrugById(id: string): Promise<Drug | null> {
    await this.initialize();
    return drugDatabase.get(id) || null;
  }

  /**
   * Get a drug by name (trade or generic, case-insensitive contains-match)
   */
  async getDrugByName(name: string): Promise<Drug | null> {
    await this.initialize();
    
    // First try exact normalized match
    const normalized = normalizeDrugName(name);
    let match = drugDatabase.get(`name:${normalized}`) || null;
    
    if (match) return match;

    // Then try case-insensitive contains match
    const searchTerm = name.toLowerCase();
    for (const drug of drugDatabase.values()) {
      if (drug.id && !drug.id.startsWith('name:')) {
        if (drug.tradeName.toLowerCase().includes(searchTerm) ||
            drug.genericName?.toLowerCase().includes(searchTerm)) {
          return drug;
        }
      }
    }

    return null;
  }

  /**
   * Get drugs by active ingredient
   */
  async getDrugsByIngredient(ingredient: string): Promise<Drug[]> {
    await this.initialize();
    const normalized = normalizeDrugName(ingredient);
    const drugIds = drugsByIngredient.get(normalized) || [];
    return drugIds.map((id) => drugDatabase.get(id)!).filter(Boolean);
  }

  /**
   * Normalize a drug name and find the best match
   */
  async normalizeDrugName(name: string): Promise<{
    normalized: string;
    matchedDrug: Drug | null;
    confidence: number;
  }> {
    await this.initialize();

    const normalized = normalizeDrugName(name);
    let matchedDrug = drugDatabase.get(`name:${normalized}`) || null;
    let confidence = matchedDrug ? 1.0 : 0;

    if (!matchedDrug) {
      // Try fuzzy matching
      const allDrugs = Array.from(drugDatabase.values()).filter(
        (d) => d.id && !d.id.startsWith('name:')
      );

      for (const drug of allDrugs) {
        const tradeSimilarity = this.calculateSimilarity(
          normalized,
          normalizeDrugName(drug.tradeName)
        );

        const genericSimilarity = drug.genericName
          ? this.calculateSimilarity(normalized, normalizeDrugName(drug.genericName))
          : 0;

        const maxSimilarity = Math.max(tradeSimilarity, genericSimilarity);

        if (maxSimilarity > confidence && maxSimilarity > 0.7) {
          confidence = maxSimilarity;
          matchedDrug = drug;
        }
      }
    }

    return {
      normalized,
      matchedDrug,
      confidence,
    };
  }

  /**
   * Simple string similarity calculation
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Levenshtein distance based similarity
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / Math.max(str1.length, str2.length);
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Sample drug data as fallback when openFDA is unavailable
   */
  private getSampleDrugData(): Drug[] {
    const drugs: Drug[] = [
      {
        id: 'drug-rimadyl-carprofen',
        tradeName: 'Rimadyl',
        genericName: 'Carprofen',
        activeIngredients: [{ name: 'Carprofen', strength: '25mg' }],
        drugClass: ['nsaid'],
        drugType: 'prescription',
        routes: ['oral'],
        approvedSpecies: ['canine'],
        manufacturer: 'Zoetis',
        indications: ['Osteoarthritis', 'Post-operative pain'],
        warnings: ['May cause GI upset', 'Monitor liver function'],
        contraindications: ['Known hypersensitivity to carprofen'],
        description: 'Rimadyl is a non-steroidal anti-inflammatory drug (NSAID) used to relieve pain and inflammation associated with osteoarthritis and to control postoperative pain in dogs.',
        totalReports: 8234,
        seriousReports: 2156,
        deathReports: 312,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-metacam-meloxicam',
        tradeName: 'Metacam',
        genericName: 'Meloxicam',
        activeIngredients: [{ name: 'Meloxicam', strength: '1.5mg/ml' }],
        drugClass: ['nsaid'],
        drugType: 'prescription',
        routes: ['oral', 'injectable'],
        approvedSpecies: ['canine', 'feline'],
        manufacturer: 'Boehringer Ingelheim',
        indications: ['Osteoarthritis', 'Pain and inflammation'],
        warnings: ['Not for use in cats for chronic conditions'],
        description: 'Metacam is a prescription NSAID used to control pain and inflammation in dogs and cats. It is commonly prescribed for osteoarthritis and post-surgical pain management.',
        totalReports: 5621,
        seriousReports: 1423,
        deathReports: 187,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-heartgard-ivermectin',
        tradeName: 'Heartgard Plus',
        genericName: 'Ivermectin/Pyrantel',
        activeIngredients: [
          { name: 'Ivermectin', strength: '68mcg' },
          { name: 'Pyrantel Pamoate', strength: '57mg' },
        ],
        drugClass: ['antiparasitic'],
        drugType: 'prescription',
        routes: ['oral'],
        approvedSpecies: ['canine'],
        manufacturer: 'Boehringer Ingelheim',
        indications: ['Heartworm prevention', 'Roundworm and hookworm treatment'],
        warnings: ['Test for heartworm before starting'],
        description: 'Heartgard Plus is a monthly chewable tablet that prevents heartworm disease and treats and controls roundworms and hookworms in dogs.',
        totalReports: 3245,
        seriousReports: 567,
        deathReports: 45,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-revolution-selamectin',
        tradeName: 'Revolution',
        genericName: 'Selamectin',
        activeIngredients: [{ name: 'Selamectin', strength: '60mg' }],
        drugClass: ['antiparasitic'],
        drugType: 'prescription',
        routes: ['topical'],
        approvedSpecies: ['canine', 'feline'],
        manufacturer: 'Zoetis',
        indications: ['Flea, heartworm, ear mite, sarcoptic mange prevention'],
        description: 'Revolution is a topical parasiticide that protects dogs and cats against fleas, heartworm, ear mites, and other parasites.',
        totalReports: 4123,
        seriousReports: 723,
        deathReports: 89,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-clavamox-amoxicillin',
        tradeName: 'Clavamox',
        genericName: 'Amoxicillin/Clavulanate',
        activeIngredients: [
          { name: 'Amoxicillin', strength: '62.5mg' },
          { name: 'Clavulanic Acid', strength: '15.625mg' },
        ],
        drugClass: ['antibiotic'],
        drugType: 'prescription',
        routes: ['oral'],
        approvedSpecies: ['canine', 'feline'],
        manufacturer: 'Zoetis',
        indications: ['Skin infections', 'Soft tissue infections', 'Urinary tract infections'],
        description: 'Clavamox is a broad-spectrum antibiotic combining amoxicillin with clavulanic acid to treat bacterial infections in dogs and cats.',
        totalReports: 2876,
        seriousReports: 412,
        deathReports: 23,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
    ];

    return drugs;
  }

  /**
   * Record that a query was searched, so it can surface in popular suggestions.
   * Capped to keep memory bounded.
   */
  trackSearch(query: string): void {
    const q = query.trim();
    if (!q || q.length > 64) return;
    const key = q.toLowerCase();
    searchPopularity.set(key, (searchPopularity.get(key) ?? 0) + 1);
    if (searchPopularity.size > 500) {
      // Evict the lowest-scoring half so the map can't grow unbounded.
      const sorted = [...searchPopularity.entries()].sort((a, b) => a[1] - b[1]);
      for (const [k] of sorted.slice(0, sorted.length / 2)) searchPopularity.delete(k);
    }
  }

  /**
   * Autocomplete-style drug-name suggestions.
   * - With `q`: prefix matches first, then substring matches, deduped, capped.
   * - Without `q`: top searched terms (or curated brand seeds on a cold start).
   */
  async getSuggestions(q: string | undefined, limit = 8): Promise<string[]> {
    await this.initialize();
    const cap = Math.max(1, Math.min(limit, 25));

    const allNames: string[] = [];
    const seen = new Set<string>();
    const pushName = (name?: string) => {
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const k = trimmed.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      allNames.push(trimmed);
    };

    for (const drug of drugDatabase.values()) {
      if (!drug.id || drug.id.startsWith('name:')) continue;
      pushName(drug.tradeName);
      if (drug.genericName) pushName(drug.genericName);
    }

    if (!q || !q.trim()) {
      // Empty query: top searched first, then curated seed.
      const popular = [...searchPopularity.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);
      const ordered: string[] = [];
      const addedKeys = new Set<string>();
      const lookup = new Map<string, string>();
      for (const n of allNames) lookup.set(n.toLowerCase(), n);

      for (const key of popular) {
        const display = lookup.get(key) ?? key;
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          ordered.push(display);
        }
        if (ordered.length >= cap) return ordered;
      }
      for (const seed of POPULAR_DRUG_SEEDS) {
        const key = seed.toLowerCase();
        const display = lookup.get(key) ?? seed;
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          ordered.push(display);
        }
        if (ordered.length >= cap) return ordered;
      }
      return ordered;
    }

    const query = q.trim().toLowerCase();
    const startsWith: string[] = [];
    const contains: string[] = [];
    for (const name of allNames) {
      const lc = name.toLowerCase();
      if (lc.startsWith(query)) startsWith.push(name);
      else if (lc.includes(query)) contains.push(name);
      if (startsWith.length >= cap) break;
    }
    return [...startsWith, ...contains].slice(0, cap);
  }
}

export const greenBookService = new GreenBookService();
export default greenBookService;
