/**
 * Recalls Service
 * Handles FDA animal/veterinary product recalls
 */

import axios from 'axios';
import { createLogger } from '../logger';
import { getFromCache, setInCache } from '../redis';
import { config } from '../../config';
import {
  Recall,
  RecallSearchParams,
  RecallSearchResult,
  RecallClass,
  RecallStatus,
  RecallType,
  createCacheKey,
} from '@petcheck/shared';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('recalls');

// FDA Enforcement API endpoint (includes animal/veterinary recalls)
const FDA_ENFORCEMENT_API = 'https://api.fda.gov/food/enforcement.json';

interface FdaEnforcementRecord {
  recall_number?: string;
  event_id?: string;
  product_description?: string;
  product_type?: string;
  recalling_firm?: string;
  reason_for_recall?: string;
  classification?: string;
  status?: string;
  voluntary_mandated?: string;
  recall_initiation_date?: string;
  report_date?: string;
  termination_date?: string;
  distribution_pattern?: string;
  product_quantity?: string;
  code_info?: string;
  center_classification_date?: string;
  initial_firm_notification?: string;
  state?: string;
  city?: string;
  country?: string;
  address_1?: string;
  address_2?: string;
  postal_code?: string;
}

interface FdaEnforcementResponse {
  meta: {
    disclaimer: string;
    terms: string;
    license: string;
    last_updated: string;
    results: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results: FdaEnforcementRecord[];
}

export class RecallsService {
  /**
   * Search recalls with filters
   */
  async search(params: RecallSearchParams): Promise<RecallSearchResult> {
    const cacheKey = createCacheKey('recalls:search', params);

    // Check cache
    const cached = await getFromCache<RecallSearchResult>(cacheKey);
    if (cached && !cached.stale) {
      logger.debug('Recalls search cache hit');
      return cached.data;
    }

    try {
      const searchQuery = this.buildSearchQuery(params);
      const limit = params.limit || 20;
      const offset = params.offset || 0;

      const response = await axios.get<FdaEnforcementResponse>(FDA_ENFORCEMENT_API, {
        params: {
          search: searchQuery,
          limit,
          skip: offset,
          api_key: config.openFda.apiKey || undefined,
        },
        timeout: 30000,
      });

      const recalls = response.data.results.map((raw) => this.transformRecall(raw));

      const result: RecallSearchResult = {
        recalls,
        total: response.data.meta.results.total,
        limit: response.data.meta.results.limit,
        offset: response.data.meta.results.skip,
        query: params,
      };

      // Cache the result
      await setInCache(cacheKey, result, {
        ttl: config.cache.recalls,
        staleTtl: config.cache.recallsStale,
      });

      logger.info(`Recalls search: ${recalls.length} results`);
      return result;
    } catch (error: any) {
      // If we have stale data, return it on error
      if (cached?.stale) {
        logger.warn('Returning stale recalls data due to error');
        return cached.data;
      }

      // If FDA API returns no results (404) or other error, return empty
      logger.error('Recalls search error:', error?.message || error);

      // Return empty result instead of throwing
      return {
        recalls: [],
        total: 0,
        limit: params.limit || 20,
        offset: params.offset || 0,
        query: params,
      };
    }
  }

  /**
   * Get recalls for specific drugs (by name matching)
   */
  async getRecallsForDrugs(drugNames: string[]): Promise<Recall[]> {
    if (drugNames.length === 0) return [];

    const cacheKey = createCacheKey('recalls:drugs', { drugs: drugNames.sort() });

    // Check cache
    const cached = await getFromCache<Recall[]>(cacheKey);
    if (cached && !cached.stale) {
      return cached.data;
    }

    try {
      // Search for each drug name
      const searchTerms = drugNames
        .map((name) => `product_description:"${name.replace(/"/g, '\\"')}"`)
        .join('+OR+');

      const response = await axios.get<FdaEnforcementResponse>(FDA_ENFORCEMENT_API, {
        params: {
          search: `(${searchTerms})+AND+product_type:"Drugs"`,
          limit: 100,
          api_key: config.openFda.apiKey || undefined,
        },
        timeout: 30000,
      });

      // Filter to animal/veterinary products (best effort based on description)
      const recalls = response.data.results
        .filter((r) => this.isVeterinaryProduct(r))
        .map((raw) => this.transformRecall(raw));

      // Cache results
      await setInCache(cacheKey, recalls, {
        ttl: config.cache.recalls,
        staleTtl: config.cache.recallsStale,
      });

      return recalls;
    } catch (error) {
      if (cached?.stale) {
        return cached.data;
      }
      logger.error('Get recalls for drugs error:', error);
      return [];
    }
  }

  /**
   * Get active recalls (ongoing status)
   */
  async getActiveRecalls(limit: number = 50): Promise<Recall[]> {
    const cacheKey = 'recalls:active';

    const cached = await getFromCache<Recall[]>(cacheKey);
    if (cached && !cached.stale) {
      return cached.data;
    }

    try {
      const response = await axios.get<FdaEnforcementResponse>(FDA_ENFORCEMENT_API, {
        params: {
          search: 'status:"Ongoing"+AND+product_type:"Drugs"',
          limit,
          api_key: config.openFda.apiKey || undefined,
        },
        timeout: 30000,
      });

      const recalls = response.data.results
        .filter((r) => this.isVeterinaryProduct(r))
        .map((raw) => this.transformRecall(raw));

      await setInCache(cacheKey, recalls, {
        ttl: config.cache.recalls,
        staleTtl: config.cache.recallsStale,
      });

      return recalls;
    } catch (error) {
      if (cached?.stale) {
        return cached.data;
      }
      logger.error('Get active recalls error:', error);
      return [];
    }
  }

  /**
   * Check if a specific drug has any active recalls
   */
  async checkDrugRecallStatus(drugName: string): Promise<{
    hasActiveRecall: boolean;
    recalls: Recall[];
  }> {
    const recalls = await this.getRecallsForDrugs([drugName]);
    const activeRecalls = recalls.filter((r) => r.status === 'ongoing');

    return {
      hasActiveRecall: activeRecalls.length > 0,
      recalls: activeRecalls,
    };
  }

  /**
   * Build FDA enforcement search query
   */
  private buildSearchQuery(params: RecallSearchParams): string {
    const queryParts: string[] = [];

    // Always filter to drugs
    queryParts.push('product_type:"Drugs"');

    if (params.query) {
      const escaped = params.query.replace(/"/g, '\\"');
      queryParts.push(`(product_description:"${escaped}"+OR+reason_for_recall:"${escaped}")`);
    }

    if (params.productName) {
      const escaped = params.productName.replace(/"/g, '\\"');
      queryParts.push(`product_description:"${escaped}"`);
    }

    if (params.manufacturer) {
      const escaped = params.manufacturer.replace(/"/g, '\\"');
      queryParts.push(`recalling_firm:"${escaped}"`);
    }

    if (params.recallClass && params.recallClass.length > 0) {
      const classes = params.recallClass.map((c) => `"Class ${c}"`).join('+OR+');
      queryParts.push(`classification:(${classes})`);
    }

    if (params.status && params.status.length > 0) {
      const statuses = params.status.map((s) => `"${this.mapStatusToFda(s)}"`).join('+OR+');
      queryParts.push(`status:(${statuses})`);
    }

    if (params.dateFrom || params.dateTo) {
      const from = params.dateFrom || '19000101';
      const to = params.dateTo || this.formatDate(new Date());
      queryParts.push(`recall_initiation_date:[${from}+TO+${to}]`);
    }

    return queryParts.join('+AND+');
  }

  /**
   * Transform FDA enforcement record to our Recall type
   */
  private transformRecall(raw: FdaEnforcementRecord): Recall {
    return {
      id: uuidv4(),
      recallNumber: raw.recall_number || raw.event_id,
      productName: raw.product_description || 'Unknown Product',
      productDescription: raw.product_description,
      manufacturer: raw.recalling_firm,
      recallClass: this.parseRecallClass(raw.classification),
      recallType: this.parseRecallType(raw),
      status: this.parseRecallStatus(raw.status),
      reason: raw.reason_for_recall || 'Reason not specified',
      initiationDate: raw.recall_initiation_date,
      reportDate: raw.report_date,
      terminationDate: raw.termination_date,
      lotNumbers: raw.code_info ? this.parseLotNumbers(raw.code_info) : undefined,
      distribution: raw.distribution_pattern,
      quantity: raw.product_quantity,
      voluntaryMandated: raw.voluntary_mandated?.toLowerCase().includes('voluntary')
        ? 'voluntary'
        : raw.voluntary_mandated?.toLowerCase().includes('mandated')
        ? 'mandated'
        : 'unknown',
      source: 'fda',
      lastUpdated: new Date(),
    };
  }

  /**
   * Check if a product appears to be veterinary/animal-related
   */
  private isVeterinaryProduct(record: FdaEnforcementRecord): boolean {
    const description = (record.product_description || '').toLowerCase();
    const reason = (record.reason_for_recall || '').toLowerCase();
    const text = `${description} ${reason}`;

    const vetKeywords = [
      'veterinary', 'animal', 'pet', 'dog', 'cat', 'horse', 'cattle',
      'livestock', 'poultry', 'swine', 'sheep', 'goat', 'bird',
      'feline', 'canine', 'equine', 'bovine', 'porcine'
    ];

    return vetKeywords.some((keyword) => text.includes(keyword));
  }

  /**
   * Parse recall class from FDA classification string
   */
  private parseRecallClass(classification?: string): RecallClass {
    if (!classification) return 'unknown';
    if (classification.includes('I') && !classification.includes('II') && !classification.includes('III')) {
      return 'I';
    }
    if (classification.includes('II') && !classification.includes('III')) {
      return 'II';
    }
    if (classification.includes('III')) {
      return 'III';
    }
    return 'unknown';
  }

  /**
   * Parse recall type
   */
  private parseRecallType(record: FdaEnforcementRecord): RecallType {
    const description = (record.product_description || '').toLowerCase();
    if (description.includes('withdrawal')) return 'withdrawal';
    if (description.includes('market withdrawal')) return 'market_withdrawal';
    return 'recall';
  }

  /**
   * Parse recall status
   */
  private parseRecallStatus(status?: string): RecallStatus {
    if (!status) return 'unknown';
    const normalized = status.toLowerCase();
    if (normalized.includes('ongoing')) return 'ongoing';
    if (normalized.includes('completed')) return 'completed';
    if (normalized.includes('terminated')) return 'terminated';
    if (normalized.includes('pending')) return 'pending';
    return 'unknown';
  }

  /**
   * Map our status to FDA status string
   */
  private mapStatusToFda(status: RecallStatus): string {
    const mapping: Record<RecallStatus, string> = {
      ongoing: 'Ongoing',
      completed: 'Completed',
      terminated: 'Terminated',
      pending: 'Pending',
      unknown: 'Unknown',
    };
    return mapping[status] || status;
  }

  /**
   * Parse lot numbers from code_info field
   */
  private parseLotNumbers(codeInfo: string): string[] {
    // Try to extract lot/batch numbers from free text
    const lotPattern = /(?:lot|batch|l\/n|b\/n)[:\s#]*([A-Z0-9\-\/]+)/gi;
    const matches: string[] = [];
    let match;

    while ((match = lotPattern.exec(codeInfo)) !== null) {
      matches.push(match[1]);
    }

    return matches.length > 0 ? matches : [codeInfo];
  }

  /**
   * Format date to YYYYMMDD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

export const recallsService = new RecallsService();
export default recallsService;
