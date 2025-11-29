/**
 * Drug Interaction Engine
 * Local rule-based interaction checking with extensibility for external APIs
 */

import { createLogger } from '../logger';
import { greenBookService } from '../openfda';
import { getFromCache, setInCache } from '../redis';
import {
  DrugInteraction,
  SpeciesInteraction,
  ConditionInteraction,
  InteractionCheckRequest,
  InteractionCheckResult,
  InteractionSeverity,
  InteractionType,
  EvidenceLevel,
  INTERACTION_DISCLAIMER,
  Drug,
  DrugClass,
  SpeciesCategory,
  createCacheKey,
  normalizeDrugName,
} from '@petcheck/shared';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';

const logger = createLogger('interaction-engine');

// Drug-drug interaction rules (curated list)
interface InteractionRule {
  drug1Pattern: string | string[];  // Drug name, ingredient, or class
  drug2Pattern: string | string[];
  severity: InteractionSeverity;
  evidence: EvidenceLevel;
  description: string;
  clinicalEffect?: string;
  mechanism?: string;
  management?: string;
  speciesSpecific?: SpeciesCategory[];
}

// Species-specific rules
interface SpeciesRule {
  drugPattern: string | string[];
  species: SpeciesCategory;
  severity: InteractionSeverity;
  type: 'contraindicated' | 'caution' | 'dose_adjustment' | 'monitoring_required';
  description: string;
  reason?: string;
  management?: string;
}

// Condition-based rules
interface ConditionRule {
  drugPattern: string | string[];
  condition: string;
  severity: InteractionSeverity;
  type: 'contraindicated' | 'caution' | 'dose_adjustment' | 'monitoring_required';
  description: string;
  reason?: string;
  management?: string;
  speciesSpecific?: SpeciesCategory[];
}

// Curated interaction rules database
const DRUG_INTERACTION_RULES: InteractionRule[] = [
  // NSAID + NSAID
  {
    drug1Pattern: ['nsaid'],
    drug2Pattern: ['nsaid'],
    severity: 'major',
    evidence: 'established',
    description: 'Concurrent use of multiple NSAIDs significantly increases the risk of gastrointestinal ulceration, bleeding, and renal toxicity.',
    clinicalEffect: 'Increased risk of GI ulceration, bleeding, and acute kidney injury',
    mechanism: 'Additive inhibition of prostaglandin synthesis',
    management: 'Avoid concurrent NSAID use. Allow a washout period of 5-7 days when switching NSAIDs.',
  },
  // NSAID + Corticosteroid
  {
    drug1Pattern: ['nsaid'],
    drug2Pattern: ['corticosteroid'],
    severity: 'major',
    evidence: 'established',
    description: 'Concurrent use of NSAIDs and corticosteroids greatly increases the risk of gastrointestinal ulceration and bleeding.',
    clinicalEffect: 'Significantly increased risk of GI ulceration and bleeding',
    mechanism: 'Both classes reduce protective prostaglandins in the GI tract',
    management: 'Avoid concurrent use if possible. If necessary, use gastroprotective agents and monitor closely.',
  },
  // NSAID + ACE inhibitors (less common in vet, but important)
  {
    drug1Pattern: ['carprofen', 'meloxicam', 'deracoxib', 'firocoxib', 'nsaid'],
    drug2Pattern: ['enalapril', 'benazepril', 'lisinopril'],
    severity: 'moderate',
    evidence: 'established',
    description: 'NSAIDs may reduce the effectiveness of ACE inhibitors and increase the risk of renal impairment.',
    clinicalEffect: 'Reduced antihypertensive effect and potential renal function decline',
    mechanism: 'NSAIDs inhibit prostaglandin-mediated renal vasodilation',
    management: 'Monitor renal function and blood pressure. Consider alternative pain management.',
  },
  // Phenobarbital + Other sedatives
  {
    drug1Pattern: ['phenobarbital'],
    drug2Pattern: ['diazepam', 'gabapentin', 'trazodone', 'sedative'],
    severity: 'moderate',
    evidence: 'established',
    description: 'Combined use may result in enhanced CNS depression.',
    clinicalEffect: 'Excessive sedation, respiratory depression',
    mechanism: 'Additive CNS depressant effects',
    management: 'Start with lower doses and titrate carefully. Monitor for excessive sedation.',
  },
  // Metronidazole + Phenobarbital
  {
    drug1Pattern: ['metronidazole'],
    drug2Pattern: ['phenobarbital'],
    severity: 'moderate',
    evidence: 'theoretical',
    description: 'Phenobarbital may increase metabolism of metronidazole, potentially reducing its efficacy.',
    clinicalEffect: 'Reduced metronidazole levels',
    mechanism: 'Hepatic enzyme induction by phenobarbital',
    management: 'Monitor for treatment efficacy. May need higher metronidazole doses.',
  },
  // Fluoroquinolones + Theophylline
  {
    drug1Pattern: ['enrofloxacin', 'marbofloxacin', 'orbifloxacin'],
    drug2Pattern: ['theophylline', 'aminophylline'],
    severity: 'moderate',
    evidence: 'established',
    description: 'Fluoroquinolones can increase theophylline levels, potentially causing toxicity.',
    clinicalEffect: 'Increased theophylline levels and potential toxicity',
    mechanism: 'Inhibition of theophylline metabolism',
    management: 'Monitor theophylline levels. Consider dose reduction or alternative antibiotic.',
  },
  // Furosemide + Aminoglycosides
  {
    drug1Pattern: ['furosemide'],
    drug2Pattern: ['gentamicin', 'amikacin', 'tobramycin', 'aminoglycoside'],
    severity: 'major',
    evidence: 'established',
    description: 'Concurrent use increases the risk of ototoxicity and nephrotoxicity.',
    clinicalEffect: 'Enhanced ototoxicity and nephrotoxicity',
    mechanism: 'Both classes are ototoxic and nephrotoxic',
    management: 'Avoid concurrent use if possible. Monitor renal function closely.',
  },
  // Tramadol + SSRIs/Serotonergic drugs
  {
    drug1Pattern: ['tramadol'],
    drug2Pattern: ['fluoxetine', 'sertraline', 'paroxetine', 'trazodone'],
    severity: 'moderate',
    evidence: 'theoretical',
    description: 'Risk of serotonin syndrome with concurrent serotonergic drugs.',
    clinicalEffect: 'Potential serotonin syndrome',
    mechanism: 'Tramadol has weak serotonin reuptake inhibition',
    management: 'Monitor for signs of serotonin syndrome (agitation, hyperthermia, tremor).',
  },
  // Digoxin + Furosemide
  {
    drug1Pattern: ['digoxin'],
    drug2Pattern: ['furosemide'],
    severity: 'moderate',
    evidence: 'established',
    description: 'Furosemide-induced hypokalemia can increase digoxin toxicity risk.',
    clinicalEffect: 'Increased risk of digoxin toxicity',
    mechanism: 'Hypokalemia enhances digoxin binding to Na+/K+-ATPase',
    management: 'Monitor potassium levels and supplement as needed. Monitor for digoxin toxicity.',
  },
  // Potassium-sparing diuretics + ACE inhibitors
  {
    drug1Pattern: ['spironolactone'],
    drug2Pattern: ['enalapril', 'benazepril'],
    severity: 'moderate',
    evidence: 'established',
    description: 'Risk of hyperkalemia with concurrent use.',
    clinicalEffect: 'Hyperkalemia',
    mechanism: 'Both drugs can increase potassium retention',
    management: 'Monitor serum potassium regularly. Adjust doses as needed.',
  },
];

// Species-specific drug concerns
const SPECIES_RULES: SpeciesRule[] = [
  // Cats and NSAIDs
  {
    drugPattern: ['nsaid', 'meloxicam', 'carprofen', 'ketoprofen'],
    species: 'feline',
    severity: 'major',
    type: 'caution',
    description: 'Cats have limited ability to metabolize NSAIDs. Most NSAIDs are not approved for chronic use in cats.',
    reason: 'Limited glucuronidation capacity leads to prolonged drug half-life',
    management: 'Use lowest effective dose for shortest duration. Meloxicam is approved only for single-dose use in cats in the US.',
  },
  // Cats and Acetaminophen
  {
    drugPattern: ['acetaminophen', 'tylenol', 'paracetamol'],
    species: 'feline',
    severity: 'contraindicated',
    type: 'contraindicated',
    description: 'Acetaminophen is HIGHLY TOXIC to cats and should NEVER be administered.',
    reason: 'Cats lack glucuronyl transferase needed to metabolize acetaminophen',
    management: 'NEVER administer acetaminophen to cats. Seek emergency care if ingestion suspected.',
  },
  // Dogs and Xylitol (sweetener, not a drug but important)
  {
    drugPattern: ['xylitol'],
    species: 'canine',
    severity: 'contraindicated',
    type: 'contraindicated',
    description: 'Xylitol is extremely toxic to dogs, causing hypoglycemia and liver failure.',
    reason: 'Causes massive insulin release in dogs',
    management: 'Never give products containing xylitol to dogs.',
  },
  // Collies and Ivermectin (MDR1 mutation)
  {
    drugPattern: ['ivermectin', 'moxidectin', 'milbemycin'],
    species: 'canine',
    severity: 'major',
    type: 'caution',
    description: 'Certain herding breeds (Collies, Shelties, Australian Shepherds) with MDR1 mutation are sensitive to high-dose ivermectin.',
    reason: 'MDR1 gene mutation allows drugs to cross blood-brain barrier',
    management: 'Test for MDR1 mutation in herding breeds. Use lower doses or alternative preventatives.',
  },
  // Greyhounds and anesthesia
  {
    drugPattern: ['thiopental', 'barbiturate'],
    species: 'canine',
    severity: 'major',
    type: 'caution',
    description: 'Sighthounds (Greyhounds, Whippets) have prolonged recovery from barbiturate anesthesia.',
    reason: 'Low body fat and altered hepatic metabolism',
    management: 'Use alternative anesthetic agents. If barbiturates required, reduce dose.',
  },
  // Horses and Phenylbutazone toxicity
  {
    drugPattern: ['phenylbutazone', 'bute'],
    species: 'equine',
    severity: 'moderate',
    type: 'monitoring_required',
    description: 'Phenylbutazone can cause serious GI ulceration and right dorsal colitis in horses.',
    reason: 'Horses are particularly susceptible to NSAID-induced GI toxicity',
    management: 'Use lowest effective dose. Provide gastroprotection. Monitor for signs of GI distress.',
  },
];

// Condition-based concerns
const CONDITION_RULES: ConditionRule[] = [
  // Kidney disease and NSAIDs
  {
    drugPattern: ['nsaid', 'carprofen', 'meloxicam', 'deracoxib'],
    condition: 'kidney disease',
    severity: 'major',
    type: 'contraindicated',
    description: 'NSAIDs are contraindicated or require extreme caution in patients with kidney disease.',
    reason: 'NSAIDs reduce renal prostaglandin-mediated blood flow',
    management: 'Avoid NSAIDs in renal patients. Consider alternative analgesics.',
  },
  // Liver disease and Phenobarbital
  {
    drugPattern: ['phenobarbital'],
    condition: 'liver disease',
    severity: 'major',
    type: 'caution',
    description: 'Phenobarbital can worsen liver disease and is primarily metabolized by the liver.',
    reason: 'Hepatotoxic potential and reduced metabolism',
    management: 'Consider alternative anticonvulsants (levetiracetam). Monitor liver values closely.',
  },
  // Heart disease and NSAIDs
  {
    drugPattern: ['nsaid'],
    condition: 'heart disease',
    severity: 'moderate',
    type: 'caution',
    description: 'NSAIDs may exacerbate fluid retention and reduce efficacy of diuretics in cardiac patients.',
    reason: 'Prostaglandin inhibition affects renal sodium and water handling',
    management: 'Use with caution. Monitor for fluid retention and worsening cardiac signs.',
  },
  // Diabetes and Corticosteroids
  {
    drugPattern: ['corticosteroid', 'prednisone', 'dexamethasone', 'prednisolone'],
    condition: 'diabetes',
    severity: 'major',
    type: 'caution',
    description: 'Corticosteroids cause hyperglycemia and can destabilize diabetic patients.',
    reason: 'Corticosteroids induce insulin resistance and gluconeogenesis',
    management: 'Avoid if possible. If necessary, monitor glucose closely and adjust insulin.',
  },
  // Seizure disorders and certain medications
  {
    drugPattern: ['acepromazine'],
    condition: 'seizure disorder',
    severity: 'major',
    type: 'contraindicated',
    description: 'Acepromazine may lower seizure threshold and should be avoided in epileptic patients.',
    reason: 'Reduces seizure threshold',
    management: 'Use alternative sedatives (trazodone, gabapentin).',
  },
  // GI ulcers and NSAIDs/Corticosteroids
  {
    drugPattern: ['nsaid', 'corticosteroid'],
    condition: 'gi ulcer',
    severity: 'contraindicated',
    type: 'contraindicated',
    description: 'NSAIDs and corticosteroids can worsen existing GI ulceration.',
    reason: 'Both reduce protective GI mucosa',
    management: 'Avoid in patients with active GI ulceration. Use gastroprotective therapy.',
  },
];

export class InteractionEngine {
  /**
   * Check interactions for a list of drugs
   */
  async checkInteractions(request: InteractionCheckRequest): Promise<InteractionCheckResult> {
    const startTime = Date.now();
    const cacheKey = createCacheKey('interactions', {
      drugs: request.drugs.map(d => d.name).sort(),
      species: request.species,
      conditions: request.conditions?.sort(),
    });

    // Check cache
    const cached = await getFromCache<InteractionCheckResult>(cacheKey);
    if (cached && !cached.stale) {
      logger.debug('Interaction check cache hit');
      return cached.data;
    }

    logger.info(`Checking interactions for ${request.drugs.length} drugs`);

    // Normalize drug names and get drug info
    const resolvedDrugs = await Promise.all(
      request.drugs.map(async (d) => {
        const normalized = await greenBookService.normalizeDrugName(d.name);
        return {
          input: d,
          normalized: normalized.normalized,
          drug: normalized.matchedDrug,
          confidence: normalized.confidence,
        };
      })
    );

    // Check drug-drug interactions
    const drugInteractions = this.checkDrugDrugInteractions(resolvedDrugs);

    // Check species-specific interactions
    const speciesInteractions = request.species
      ? this.checkSpeciesInteractions(resolvedDrugs, request.species)
      : [];

    // Check condition-based interactions
    const conditionInteractions = request.conditions
      ? this.checkConditionInteractions(resolvedDrugs, request.conditions, request.species)
      : [];

    // Calculate summary
    const allInteractions = [
      ...drugInteractions,
      ...speciesInteractions.map(s => ({ severity: s.severity })),
      ...conditionInteractions.map(c => ({ severity: c.severity })),
    ];

    const summary = {
      totalInteractions: allInteractions.length,
      majorCount: allInteractions.filter(i => i.severity === 'major' || i.severity === 'contraindicated').length,
      moderateCount: allInteractions.filter(i => i.severity === 'moderate').length,
      minorCount: allInteractions.filter(i => i.severity === 'minor').length,
      unknownCount: allInteractions.filter(i => i.severity === 'unknown').length,
      highestSeverity: this.getHighestSeverity(allInteractions.map(i => i.severity)),
    };

    const result: InteractionCheckResult = {
      drugInteractions,
      speciesInteractions,
      conditionInteractions,
      summary,
      checkedDrugs: resolvedDrugs.map(d => d.input.name),
      checkedAt: new Date(),
      disclaimer: INTERACTION_DISCLAIMER,
    };

    // Cache result
    await setInCache(cacheKey, result, {
      ttl: config.cache.interactions,
      staleTtl: config.cache.interactions,
    });

    logger.info(`Interaction check completed in ${Date.now() - startTime}ms: ${summary.totalInteractions} interactions found`);
    return result;
  }

  /**
   * Check drug-drug interactions
   */
  private checkDrugDrugInteractions(
    drugs: Array<{
      input: { name: string; drugId?: string };
      normalized: string;
      drug: Drug | null;
      confidence: number;
    }>
  ): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];

    // Check each pair of drugs
    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        const drug1 = drugs[i];
        const drug2 = drugs[j];

        // Check against interaction rules
        for (const rule of DRUG_INTERACTION_RULES) {
          if (this.matchesDrugPattern(drug1, rule.drug1Pattern) &&
              this.matchesDrugPattern(drug2, rule.drug2Pattern)) {
            interactions.push({
              id: uuidv4(),
              drug1: {
                name: drug1.input.name,
                drugId: drug1.drug?.id,
                activeIngredient: drug1.drug?.activeIngredients[0]?.name,
                drugClass: drug1.drug?.drugClass[0],
              },
              drug2: {
                name: drug2.input.name,
                drugId: drug2.drug?.id,
                activeIngredient: drug2.drug?.activeIngredients[0]?.name,
                drugClass: drug2.drug?.drugClass[0],
              },
              severity: rule.severity,
              type: 'drug_drug',
              evidence: rule.evidence,
              description: rule.description,
              clinicalEffect: rule.clinicalEffect,
              mechanism: rule.mechanism,
              management: rule.management,
              speciesSpecific: rule.speciesSpecific,
              sources: [{ type: 'curated', reference: 'PetCheck Interaction Database' }],
              lastUpdated: new Date(),
            });
          }
          // Also check reverse order
          else if (this.matchesDrugPattern(drug2, rule.drug1Pattern) &&
                   this.matchesDrugPattern(drug1, rule.drug2Pattern)) {
            interactions.push({
              id: uuidv4(),
              drug1: {
                name: drug2.input.name,
                drugId: drug2.drug?.id,
                activeIngredient: drug2.drug?.activeIngredients[0]?.name,
                drugClass: drug2.drug?.drugClass[0],
              },
              drug2: {
                name: drug1.input.name,
                drugId: drug1.drug?.id,
                activeIngredient: drug1.drug?.activeIngredients[0]?.name,
                drugClass: drug1.drug?.drugClass[0],
              },
              severity: rule.severity,
              type: 'drug_drug',
              evidence: rule.evidence,
              description: rule.description,
              clinicalEffect: rule.clinicalEffect,
              mechanism: rule.mechanism,
              management: rule.management,
              speciesSpecific: rule.speciesSpecific,
              sources: [{ type: 'curated', reference: 'PetCheck Interaction Database' }],
              lastUpdated: new Date(),
            });
          }
        }
      }
    }

    return interactions;
  }

  /**
   * Check species-specific interactions
   */
  private checkSpeciesInteractions(
    drugs: Array<{
      input: { name: string };
      normalized: string;
      drug: Drug | null;
      confidence: number;
    }>,
    species: SpeciesCategory
  ): SpeciesInteraction[] {
    const interactions: SpeciesInteraction[] = [];

    for (const drugInfo of drugs) {
      for (const rule of SPECIES_RULES) {
        if (rule.species === species && this.matchesDrugPattern(drugInfo, rule.drugPattern)) {
          interactions.push({
            id: uuidv4(),
            drugName: drugInfo.input.name,
            drugId: drugInfo.drug?.id,
            activeIngredient: drugInfo.drug?.activeIngredients[0]?.name,
            species,
            severity: rule.severity,
            type: rule.type,
            description: rule.description,
            reason: rule.reason,
            management: rule.management,
            sources: [{ type: 'curated', reference: 'PetCheck Species Database' }],
            lastUpdated: new Date(),
          });
        }
      }
    }

    return interactions;
  }

  /**
   * Check condition-based interactions
   */
  private checkConditionInteractions(
    drugs: Array<{
      input: { name: string };
      normalized: string;
      drug: Drug | null;
      confidence: number;
    }>,
    conditions: string[],
    species?: SpeciesCategory
  ): ConditionInteraction[] {
    const interactions: ConditionInteraction[] = [];

    for (const drugInfo of drugs) {
      for (const condition of conditions) {
        const normalizedCondition = condition.toLowerCase();

        for (const rule of CONDITION_RULES) {
          const ruleCondition = rule.condition.toLowerCase();

          if ((ruleCondition.includes(normalizedCondition) || normalizedCondition.includes(ruleCondition)) &&
              this.matchesDrugPattern(drugInfo, rule.drugPattern)) {
            // Check species-specificity
            if (rule.speciesSpecific && species && !rule.speciesSpecific.includes(species)) {
              continue;
            }

            interactions.push({
              id: uuidv4(),
              drugName: drugInfo.input.name,
              drugId: drugInfo.drug?.id,
              condition: rule.condition,
              severity: rule.severity,
              type: rule.type,
              description: rule.description,
              reason: rule.reason,
              management: rule.management,
              speciesSpecific: rule.speciesSpecific,
              sources: [{ type: 'curated', reference: 'PetCheck Condition Database' }],
              lastUpdated: new Date(),
            });
          }
        }
      }
    }

    return interactions;
  }

  /**
   * Check if a drug matches a pattern (name, ingredient, or class)
   */
  private matchesDrugPattern(
    drugInfo: {
      normalized: string;
      drug: Drug | null;
    },
    pattern: string | string[]
  ): boolean {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    for (const p of patterns) {
      const normalizedPattern = p.toLowerCase();

      // Check drug name
      if (drugInfo.normalized.includes(normalizedPattern)) {
        return true;
      }

      // Check if pattern is a drug class
      if (drugInfo.drug?.drugClass.some(c => c.toLowerCase() === normalizedPattern)) {
        return true;
      }

      // Check active ingredients
      if (drugInfo.drug?.activeIngredients.some(i =>
        i.name.toLowerCase().includes(normalizedPattern)
      )) {
        return true;
      }

      // Check generic name
      if (drugInfo.drug?.genericName?.toLowerCase().includes(normalizedPattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the highest severity from a list
   */
  private getHighestSeverity(severities: InteractionSeverity[]): InteractionSeverity {
    const order: InteractionSeverity[] = ['contraindicated', 'major', 'moderate', 'minor', 'unknown', 'none'];

    for (const severity of order) {
      if (severities.includes(severity)) {
        return severity;
      }
    }

    return 'none';
  }
}

export const interactionEngine = new InteractionEngine();
export default interactionEngine;
