/**
 * Green Book Service
 * FDA's database of approved animal drug products
 */

import axios from 'axios';
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

const logger = createLogger('green-book');

// Green Book data is available via FDA's open data
// Note: In production, you'd want to periodically sync this data
const GREEN_BOOK_URL = 'https://www.fda.gov/media/70939/download'; // CSV format

// For demo purposes, we'll create a local drug database structure
// In production, this would be populated from the actual Green Book

interface GreenBookEntry {
  NADA_Number?: string;
  ANADA_Number?: string;
  Trade_Name?: string;
  International_Nonproprietary_Name?: string;
  Active_Ingredient?: string;
  Dosage_Form?: string;
  Route?: string;
  Species?: string;
  Marketing_Status?: string;
  Application_Type?: string;
  Sponsor?: string;
}

// Local drug cache populated from various sources
let drugDatabase: Map<string, Drug> = new Map();
let drugsByIngredient: Map<string, string[]> = new Map();
let initialized = false;

export class GreenBookService {
  /**
   * Initialize the Green Book service with sample/mock data
   * In production, this would load from the actual Green Book database
   */
  async initialize(): Promise<void> {
    if (initialized) return;

    const cacheKey = 'greenbook:drugs';
    const cached = await getFromCache<Drug[]>(cacheKey);

    if (cached) {
      this.loadDrugsIntoMemory(cached.data);
      initialized = true;
      logger.info(`Loaded ${drugDatabase.size} drugs from cache`);
      return;
    }

    // Load sample drug data (in production, fetch from Green Book)
    const sampleDrugs = this.getSampleDrugData();
    this.loadDrugsIntoMemory(sampleDrugs);

    // Cache the drug data
    await setInCache(cacheKey, sampleDrugs, {
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

    let results = Array.from(drugDatabase.values()).filter((d) => d.id && !d.id.startsWith('name:'));

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
   * Get a drug by name (trade or generic)
   */
  async getDrugByName(name: string): Promise<Drug | null> {
    await this.initialize();
    const normalized = normalizeDrugName(name);
    return drugDatabase.get(`name:${normalized}`) || null;
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
   * Sample drug data for development/demo
   * In production, this would be loaded from the actual Green Book
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
      {
        id: 'drug-convenia-cefovecin',
        tradeName: 'Convenia',
        genericName: 'Cefovecin',
        activeIngredients: [{ name: 'Cefovecin', strength: '80mg/ml' }],
        drugClass: ['antibiotic'],
        drugType: 'prescription',
        routes: ['injectable'],
        approvedSpecies: ['canine', 'feline'],
        manufacturer: 'Zoetis',
        indications: ['Skin infections', 'Urinary tract infections'],
        warnings: ['Long-acting - lasts up to 14 days'],
        description: 'Convenia is a long-acting injectable antibiotic that provides up to 14 days of treatment with a single injection for skin and soft tissue infections.',
        totalReports: 1543,
        seriousReports: 287,
        deathReports: 34,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-apoquel-oclacitinib',
        tradeName: 'Apoquel',
        genericName: 'Oclacitinib',
        activeIngredients: [{ name: 'Oclacitinib', strength: '16mg' }],
        drugClass: ['immunosuppressant'],
        drugType: 'prescription',
        routes: ['oral'],
        approvedSpecies: ['canine'],
        manufacturer: 'Zoetis',
        indications: ['Allergic dermatitis', 'Atopic dermatitis'],
        warnings: ['May increase susceptibility to infections', 'Do not use in dogs less than 12 months of age', 'Use with caution in dogs with serious infections', 'Monitor for development of infections and neoplasia'],
        contraindications: ['Dogs less than 12 months of age'],
        description: 'Apoquel is used to control itching associated with allergic dermatitis and control of atopic dermatitis in dogs at least 12 months of age.',
        totalReports: 12543,
        seriousReports: 3421,
        deathReports: 234,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-bravecto-fluralaner',
        tradeName: 'Bravecto',
        genericName: 'Fluralaner',
        activeIngredients: [{ name: 'Fluralaner', strength: '112.5mg' }],
        drugClass: ['antiparasitic'],
        drugType: 'prescription',
        routes: ['oral', 'topical'],
        approvedSpecies: ['canine', 'feline'],
        manufacturer: 'Merck Animal Health',
        indications: ['Flea and tick prevention'],
        warnings: ['Use with caution in dogs with seizure history'],
        description: 'Bravecto is a long-lasting flea and tick treatment that protects dogs and cats for up to 12 weeks with a single dose.',
        totalReports: 9876,
        seriousReports: 2345,
        deathReports: 178,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-prednisone',
        tradeName: 'Prednisone',
        genericName: 'Prednisone',
        activeIngredients: [{ name: 'Prednisone', strength: '5mg' }],
        drugClass: ['corticosteroid'],
        drugType: 'prescription',
        routes: ['oral'],
        approvedSpecies: ['canine', 'feline', 'equine'],
        manufacturer: 'Various',
        indications: ['Inflammation', 'Allergies', 'Immune-mediated diseases'],
        warnings: ['Long-term use may cause Cushing-like symptoms'],
        description: 'Prednisone is a corticosteroid used to treat inflammation, allergies, and immune-mediated conditions in dogs, cats, and horses.',
        totalReports: 6234,
        seriousReports: 1567,
        deathReports: 123,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-gabapentin',
        tradeName: 'Gabapentin',
        genericName: 'Gabapentin',
        activeIngredients: [{ name: 'Gabapentin', strength: '100mg' }],
        drugClass: ['anticonvulsant', 'analgesic'],
        drugType: 'prescription',
        routes: ['oral'],
        approvedSpecies: ['canine', 'feline'],
        manufacturer: 'Various',
        indications: ['Seizures', 'Chronic pain', 'Anxiety'],
        warnings: ['May cause sedation'],
        description: 'Gabapentin is used to treat seizures, chronic pain, and anxiety in dogs and cats. It is often prescribed for neuropathic pain.',
        totalReports: 3456,
        seriousReports: 623,
        deathReports: 45,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-cerenia-maropitant',
        tradeName: 'Cerenia',
        genericName: 'Maropitant',
        activeIngredients: [{ name: 'Maropitant Citrate', strength: '24mg' }],
        drugClass: ['antiemetic'],
        drugType: 'prescription',
        routes: ['oral', 'injectable'],
        approvedSpecies: ['canine', 'feline'],
        manufacturer: 'Zoetis',
        indications: ['Motion sickness', 'Vomiting'],
        description: 'Cerenia is an antiemetic used to prevent and treat vomiting and motion sickness in dogs and cats.',
        totalReports: 2134,
        seriousReports: 312,
        deathReports: 28,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
      {
        id: 'drug-adequan-psgag',
        tradeName: 'Adequan',
        genericName: 'Polysulfated Glycosaminoglycan',
        activeIngredients: [{ name: 'PSGAG', strength: '100mg/ml' }],
        drugClass: ['other'],
        drugType: 'prescription',
        routes: ['injectable'],
        approvedSpecies: ['canine', 'equine'],
        manufacturer: 'American Regent',
        indications: ['Osteoarthritis', 'Degenerative joint disease'],
        description: 'Adequan is an injectable disease-modifying osteoarthritis drug that helps protect cartilage and joint health in dogs and horses.',
        totalReports: 1876,
        seriousReports: 234,
        deathReports: 12,
        source: 'greenbook',
        lastUpdated: new Date(),
      },
    ];

    return drugs;
  }
}

export const greenBookService = new GreenBookService();
export default greenBookService;
