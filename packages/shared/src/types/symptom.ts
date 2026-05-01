/**
 * Symptom checker types
 *
 * CommonSymptom is the seed list for the symptom-picker combobox. The
 * veddraTerms are lowercase substrings the backend matches against the
 * top-reactions list returned by the openFDA adverse-events summary.
 * VeDDRA = Veterinary Dictionary for Drug Regulatory Activities.
 */

export interface CommonSymptom {
  id: string;
  displayLabel: string;
  veddraTerms: string[];
}

export interface SymptomCheckRequest {
  petId: string;
  symptom: string;
}

export interface SymptomMatch {
  drugId?: string;
  drugName: string;
  rank: number;
  count: number;
  totalReports: number;
  reactionTerm: string;
}

export interface SymptomCheckResponse {
  matches: SymptomMatch[];
  unmatched: string[];
}

/**
 * COMMON_SYMPTOMS is parsed from JSON to keep this file portable across
 * tools that re-tokenize TS object literals strangely. The shape matches
 * `CommonSymptom`.
 */
export const COMMON_SYMPTOMS: CommonSymptom[] = JSON.parse(
  '[' +
    '{"id":"vomiting","displayLabel":"Vomiting","veddraTerms":["vomit","emesis","regurgitation"]},' +
    '{"id":"diarrhea","displayLabel":"Diarrhea","veddraTerms":["diarrhea","diarrhoea","loose stool","soft faeces","soft feces"]},' +
    '{"id":"lethargy","displayLabel":"Lethargy","veddraTerms":["lethargy","lethargic","depression","malaise","listless"]},' +
    '{"id":"anorexia","displayLabel":"Loss of appetite (anorexia)","veddraTerms":["anorexia","inappetence","decreased appetite","appetite lost","appetite decreased"]},' +
    '{"id":"pruritus","displayLabel":"Itching (pruritus)","veddraTerms":["pruritus","itching","scratching"]},' +
    '{"id":"seizures","displayLabel":"Seizures","veddraTerms":["seizure","convulsion","epilepsy"]},' +
    '{"id":"ataxia","displayLabel":"Ataxia (loss of coordination)","veddraTerms":["ataxia","incoordination","unsteady","staggering"]},' +
    '{"id":"tremors","displayLabel":"Tremors","veddraTerms":["tremor","shaking","shivering"]},' +
    '{"id":"pu_pd","displayLabel":"Increased thirst / urination (PU/PD)","veddraTerms":["polyuria","polydipsia","increased thirst","increased urination","pu/pd"]},' +
    '{"id":"weight_loss","displayLabel":"Weight loss","veddraTerms":["weight loss","weight decreased","cachexia","wasting"]},' +
    '{"id":"hypersalivation","displayLabel":"Excessive drooling","veddraTerms":["hypersalivation","salivation","drooling","ptyalism"]},' +
    '{"id":"dyspnea","displayLabel":"Difficulty breathing (dyspnea)","veddraTerms":["dyspnea","dyspnoea","respiratory distress","breathing difficulty","tachypnea"]},' +
    '{"id":"tachycardia","displayLabel":"Rapid heart rate (tachycardia)","veddraTerms":["tachycardia","rapid heart rate","heart rate increased"]},' +
    '{"id":"hematemesis","displayLabel":"Vomiting blood (hematemesis)","veddraTerms":["hematemesis","haematemesis","vomiting blood","bloody vomit"]},' +
    '{"id":"jaundice","displayLabel":"Jaundice (yellowing)","veddraTerms":["jaundice","icterus","yellow mucous membrane"]}' +
  ']'
);
