/**
 * Adverse Events Service
 * Handles openFDA Animal & Veterinary adverse event data
 */

import { openFdaClient, OpenFdaResponse, OpenFdaCountResponse } from './client';
import { createLogger } from '../logger';
import {
  AdverseEvent,
  AdverseEventSearchParams,
  AdverseEventSearchResult,
  AdverseEventAggregation,
  AdverseEventSummary,
  AnimalInfo,
  DrugInEvent,
  Reaction,
  OutcomeSeriousness,
  SpeciesCategory,
  getSpeciesByName,
  buildOpenFdaSearchQuery,
  formatDateForOpenFda,
} from '@petcheck/shared';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';

const logger = createLogger('adverse-events');

// OpenFDA raw event structure (simplified)
interface OpenFdaAdverseEvent {
  unique_aer_id_number?: string;
  original_receive_date?: string;
  receiver?: {
    receiver_organization?: string;
  };
  primary_reporter?: string;
  number_of_animals_affected?: number;
  number_of_animals_treated?: number;
  animal?: {
    species?: {
      breed?: {
        is_crossbred?: string;
        breed_component?: string;
      };
      name?: string;
    };
    gender?: string;
    reproductive_status?: string;
    age?: {
      max?: number;
      min?: number;
      unit?: string;
      qualifier?: string;
    };
    weight?: {
      max?: number;
      min?: number;
      unit?: string;
      qualifier?: string;
    };
  };
  drug?: Array<{
    active_ingredients?: Array<{
      name?: string;
    }>;
    brand_name?: string;
    manufacturer?: {
      name?: string;
    };
    atc_vet_code?: string;
    lot_number?: string;
    used_according_to_label?: string;
    dosage_form?: string;
    route?: string;
    dose?: {
      numerator?: number;
      numerator_unit?: string;
      denominator?: number;
      denominator_unit?: string;
    };
    frequency_of_administration?: {
      unit?: string;
      value?: number;
    };
    first_exposure_date?: string;
    last_exposure_date?: string;
    previous_exposure_to_drug?: string;
  }>;
  reaction?: Array<{
    veddra_term_code?: string;
    veddra_term_name?: string;
    veddra_version?: string;
    accuracy?: string;
  }>;
  outcome?: Array<{
    medical_status?: string;
    number_of_animals_affected?: number;
  }>;
  duration?: {
    unit?: string;
    value?: number;
  };
  onset_date?: string;
  type_of_information?: string;
  report_id?: string;
  health_assessment_prior_to_exposure?: {
    assessed_by?: string;
    condition?: string;
  };
}

export class AdverseEventsService {
  /**
   * Search adverse events with filters
   */
  async search(params: AdverseEventSearchParams): Promise<AdverseEventSearchResult> {
    const searchQuery = this.buildSearchQuery(params);
    const openFdaUrl = openFdaClient.buildQueryUrl(
      config.openFda.adverseEventsEndpoint,
      {
        search: searchQuery,
        limit: params.limit,
        skip: params.skip,
      }
    );

    try {
      const { data, cached, stale } = await openFdaClient.searchAdverseEvents({
        search: searchQuery,
        limit: params.limit || 20,
        skip: params.skip || 0,
      });

      const response = data as OpenFdaResponse<OpenFdaAdverseEvent>;
      const events = response.results.map((raw) => this.transformEvent(raw));

      logger.info(`Adverse events search: ${events.length} results, cached: ${cached}, stale: ${stale}`);

      return {
        events,
        total: response.meta.results.total,
        limit: response.meta.results.limit,
        skip: response.meta.results.skip,
        query: params,
        openFdaQuery: openFdaUrl,
      };
    } catch (error) {
      logger.error('Adverse events search error:', error);
      throw error;
    }
  }

  /**
   * Get aggregated counts by field
   */
  async getAggregation(
    params: AdverseEventSearchParams,
    countField: string,
    limit: number = 100
  ): Promise<AdverseEventAggregation> {
    const searchQuery = this.buildSearchQuery(params);

    const fieldMapping: Record<string, string> = {
      time_series: 'original_receive_date',
      reaction: 'reaction.veddra_term_name.exact',
      species: 'animal.species.exact', // Note: may not be aggregatable in all cases
      outcome: 'outcome.medical_status.exact',
      drug: 'drug.brand_name.exact',
      route: 'drug.route.exact',
    };

    const openFdaField = fieldMapping[countField] || countField;

    try {
      const { data, cached, stale } = await openFdaClient.countAdverseEvents({
        search: searchQuery || undefined,
        count: openFdaField,
        limit,
      });

      const response = data as OpenFdaCountResponse;

      logger.info(`Adverse events aggregation (${countField}): ${response.results.length} terms, cached: ${cached}`);

      return {
        type: countField as AdverseEventAggregation['type'],
        data: response.results.map((r) => ({
          field: countField,
          term: r.term,
          count: r.count,
        })),
        total: response.results.reduce((sum, r) => sum + r.count, 0),
        query: params,
      };
    } catch (error) {
      logger.error('Adverse events aggregation error:', error);
      throw error;
    }
  }

  /**
   * Get a summary for a specific drug
   * @param drugName - The brand name of the drug
   * @param genericName - Optional generic name (active ingredient) for better search results
   */
  async getDrugSummary(drugName: string, genericName?: string): Promise<AdverseEventSummary> {
    const searchParams: AdverseEventSearchParams = {
      drugName,
      activeIngredient: genericName, // Use generic name for active ingredient search
    };

    try {
      // Fetch multiple aggregations in parallel using allSettled to handle partial failures
      const results = await Promise.allSettled([
        this.getAggregation(searchParams, 'outcome', 10),
        this.getAggregation(searchParams, 'reaction', 20),
        this.getAggregation(searchParams, 'time_series', 60), // Last 5 years monthly
        this.search({ ...searchParams, limit: 1 }),
      ]);

      // Extract results, using empty arrays for failed requests
      const outcomeAgg = results[0].status === 'fulfilled' ? results[0].value : null;
      const reactionAgg = results[1].status === 'fulfilled' ? results[1].value : null;
      const timeSeriesAgg = results[2].status === 'fulfilled' ? results[2].value : null;
      const totalResult = results[3].status === 'fulfilled' ? results[3].value : null;

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const fieldNames = ['outcome', 'reaction', 'time_series', 'search'];
          logger.warn(`Aggregation ${fieldNames[index]} failed:`, result.reason?.message || result.reason);
        }
      });

      const totalReports = totalResult?.total || 0;

      // Calculate serious and death reports from outcome breakdown
      let seriousReports = 0;
      let deathReports = 0;
      if (outcomeAgg?.data) {
        for (const item of outcomeAgg.data) {
          const outcome = this.mapOutcome(item.term);
          if (outcome === 'died' || outcome === 'euthanized') {
            deathReports += item.count;
            seriousReports += item.count;
          } else if (outcome !== 'not_serious' && outcome !== 'unknown') {
            seriousReports += item.count;
          }
        }
      }

      return {
        drugName,
        totalReports,
        seriousReports,
        deathReports,
        speciesBreakdown: [], // Species aggregation not available in FDA API
        outcomeBreakdown: outcomeAgg?.data.map((d) => ({
          outcome: this.mapOutcome(d.term),
          count: d.count,
        })) || [],
        topReactions: reactionAgg?.data.slice(0, 10).map((d) => ({
          reaction: d.term,
          count: d.count,
        })) || [],
        timeSeriesMonthly: timeSeriesAgg ? this.formatTimeSeries(timeSeriesAgg.data) : [],
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error('Drug summary error:', error);
      // Return empty summary instead of throwing
      return {
        drugName,
        totalReports: 0,
        seriousReports: 0,
        deathReports: 0,
        speciesBreakdown: [],
        outcomeBreakdown: [],
        topReactions: [],
        timeSeriesMonthly: [],
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Build openFDA search query from params
   */
  private buildSearchQuery(params: AdverseEventSearchParams): string {
    const queryParts: string[] = [];

    if (params.species && params.species.length > 0) {
      const speciesTerms = params.species
        .map((s) => getSpeciesByName(s))
        .flatMap((s) => s?.openFdaTerms || []);
      if (speciesTerms.length > 0) {
        queryParts.push(`animal.species:(${speciesTerms.join(' OR ')})`);
      }
    }

    if (params.drugName) {
      // Escape special characters - spaces in terms should be replaced with +
      // Use spaces around OR operator (not +OR+) to let axios handle URL encoding correctly
      const escapedDrug = params.drugName.replace(/[+:()]/g, ' ').trim().replace(/\s+/g, '+');
      // If we have a separate active ingredient (generic name), use it for ingredient search
      // Otherwise, search with the drug name in both fields
      if (params.activeIngredient) {
        const escapedIngredient = params.activeIngredient.replace(/[+:()]/g, ' ').trim().replace(/\s+/g, '+');
        queryParts.push(`(drug.brand_name:${escapedDrug} OR drug.active_ingredients.name:${escapedIngredient})`);
      } else {
        queryParts.push(`(drug.brand_name:${escapedDrug} OR drug.active_ingredients.name:${escapedDrug})`);
      }
    } else if (params.activeIngredient) {
      const escaped = params.activeIngredient.replace(/[+:()]/g, ' ').trim().replace(/\s+/g, '+');
      queryParts.push(`drug.active_ingredients.name:${escaped}`);
    }

    if (params.manufacturer) {
      const escaped = params.manufacturer.replace(/"/g, '\\"');
      queryParts.push(`drug.manufacturer.name:"${escaped}"`);
    }

    if (params.reaction) {
      const escaped = params.reaction.replace(/"/g, '\\"');
      queryParts.push(`reaction.veddra_term_name:"${escaped}"`);
    }

    if (params.outcome && params.outcome.length > 0) {
      const outcomeTerms = params.outcome.map((o) => this.reverseMapOutcome(o));
      queryParts.push(`outcome.medical_status:(${outcomeTerms.join(' OR ')})`);
    }

    if (params.route) {
      queryParts.push(`drug.route:"${params.route}"`);
    }

    if (params.dateFrom || params.dateTo) {
      const from = params.dateFrom || '19000101';
      const to = params.dateTo || formatDateForOpenFda(new Date());
      queryParts.push(`original_receive_date:[${from} TO ${to}]`);
    }

    return queryParts.join(' AND ');
  }

  /**
   * Transform raw openFDA event to our AdverseEvent type
   */
  private transformEvent(raw: OpenFdaAdverseEvent): AdverseEvent {
    const animal: AnimalInfo = {
      species: raw.animal?.species?.name || 'Unknown',
      speciesCategory: this.inferSpeciesCategory(raw.animal?.species?.name),
      breed: raw.animal?.species?.breed?.breed_component,
      gender: this.mapGender(raw.animal?.gender),
      reproductiveStatus: raw.animal?.reproductive_status,
    };

    if (raw.animal?.age?.min !== undefined) {
      animal.age = {
        value: raw.animal.age.min,
        unit: this.mapAgeUnit(raw.animal.age.unit),
      };
    }

    if (raw.animal?.weight?.min !== undefined) {
      animal.weight = {
        value: raw.animal.weight.min,
        unit: raw.animal.weight.unit?.toLowerCase() === 'kg' ? 'kg' : 'lb',
      };
    }

    const drugs: DrugInEvent[] = (raw.drug || []).map((d) => ({
      brandName: d.brand_name,
      activeIngredients: d.active_ingredients?.map((i) => i.name || '').filter(Boolean),
      manufacturer: d.manufacturer?.name,
      route: d.route,
      lotNumber: d.lot_number,
      usedAccordingToLabel: d.used_according_to_label === 'true',
      previousExposure: d.previous_exposure_to_drug === 'true',
      startDate: d.first_exposure_date,
      endDate: d.last_exposure_date,
      dosage: d.dose?.numerator ? {
        value: d.dose.numerator,
        unit: d.dose.numerator_unit || '',
      } : undefined,
      frequency: d.frequency_of_administration?.value
        ? `${d.frequency_of_administration.value} ${d.frequency_of_administration.unit || ''}`
        : undefined,
    }));

    const reactions: Reaction[] = (raw.reaction || []).map((r) => ({
      term: r.veddra_term_name || 'Unknown',
      openFdaTerm: r.veddra_term_name,
      veddraCode: r.veddra_term_code,
      accuracy: r.accuracy === 'actual' ? 'exact' : 'related',
    }));

    const outcomes: OutcomeSeriousness[] = (raw.outcome || [])
      .map((o) => this.mapOutcome(o.medical_status))
      .filter((o): o is OutcomeSeriousness => o !== 'unknown');

    return {
      id: uuidv4(),
      reportId: raw.unique_aer_id_number || raw.report_id || 'unknown',
      receiptDate: raw.original_receive_date || '',
      onsetDate: raw.onset_date,
      animal,
      drugs,
      reactions,
      outcomes: outcomes.length > 0 ? outcomes : ['unknown'],
      numberOfAnimals: raw.number_of_animals_treated,
      numberOfAnimalsAffected: raw.number_of_animals_affected,
      reporterType: this.mapReporterType(raw.primary_reporter),
      duration: raw.duration?.value ? {
        value: raw.duration.value,
        unit: raw.duration.unit || 'day',
      } : undefined,
      source: 'openfda',
      rawData: raw as unknown as Record<string, unknown>,
    };
  }

  /**
   * Helper methods for data transformation
   */
  private inferSpeciesCategory(species?: string): SpeciesCategory | undefined {
    if (!species) return undefined;
    const found = getSpeciesByName(species);
    return found?.id;
  }

  private mapGender(gender?: string): AnimalInfo['gender'] {
    if (!gender) return 'unknown';
    const normalized = gender.toLowerCase();
    if (normalized.includes('female')) {
      return normalized.includes('intact') ? 'female' : 'spayed_female';
    }
    if (normalized.includes('male')) {
      return normalized.includes('intact') ? 'male' : 'neutered_male';
    }
    return 'unknown';
  }

  private mapAgeUnit(unit?: string): 'day' | 'week' | 'month' | 'year' {
    if (!unit) return 'year';
    const normalized = unit.toLowerCase();
    if (normalized.includes('day')) return 'day';
    if (normalized.includes('week')) return 'week';
    if (normalized.includes('month')) return 'month';
    return 'year';
  }

  private mapOutcome(status?: string): OutcomeSeriousness {
    if (!status) return 'unknown';
    const normalized = status.toLowerCase();

    if (normalized.includes('died') || normalized.includes('death')) return 'died';
    if (normalized.includes('euthan')) return 'euthanized';
    if (normalized.includes('life') && normalized.includes('threat')) return 'life_threatening';
    if (normalized.includes('hospital')) return 'hospitalized';
    if (normalized.includes('disab')) return 'disability';
    if (normalized.includes('congen') || normalized.includes('anomal')) return 'congenital_anomaly';
    if (normalized.includes('serious')) return 'other_serious';
    if (normalized.includes('recover') || normalized.includes('resolved')) return 'not_serious';

    return 'unknown';
  }

  private reverseMapOutcome(outcome: OutcomeSeriousness): string {
    const mapping: Record<OutcomeSeriousness, string> = {
      died: 'Died',
      euthanized: 'Euthanized',
      life_threatening: 'Life-threatening',
      hospitalized: 'Hospitalized',
      disability: 'Disability',
      congenital_anomaly: 'Congenital Anomaly',
      other_serious: 'Other Serious',
      not_serious: 'Recovered/Resolved',
      unknown: 'Unknown',
    };
    return mapping[outcome] || outcome;
  }

  private mapReporterType(reporter?: string): AdverseEvent['reporterType'] {
    if (!reporter) return 'other';
    const normalized = reporter.toLowerCase();
    if (normalized.includes('vet')) return 'veterinarian';
    if (normalized.includes('owner') || normalized.includes('consumer')) return 'owner';
    if (normalized.includes('manufact')) return 'manufacturer';
    return 'other';
  }

  private formatTimeSeries(data: { term: string; count: number }[]): { month: string; count: number }[] {
    // OpenFDA returns dates as YYYYMMDD integers
    return data
      .filter((d) => d.term && d.term.length >= 6)
      .map((d) => ({
        month: `${d.term.substring(0, 4)}-${d.term.substring(4, 6)}`,
        count: d.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}

export const adverseEventsService = new AdverseEventsService();
export default adverseEventsService;
