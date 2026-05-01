import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Alert } from '../components/ui/Alert';
import { Disclaimer } from '../components/common/Disclaimer';
import type { SymptomMatch, SymptomCheckResponse, Pet, CommonSymptom } from '@petcheck/shared';

// Mirror of shared COMMON_SYMPTOMS. Inlined because Vite/Rollup's CJS
// interop drops re-exported runtime values from the shared package's
// __exportStar tree at build time. Type-only imports above are fine.
const COMMON_SYMPTOMS: CommonSymptom[] = [
  { id: 'vomiting', displayLabel: 'Vomiting', veddraTerms: ['vomit', 'emesis', 'regurgitation'] },
  { id: 'diarrhea', displayLabel: 'Diarrhea', veddraTerms: ['diarrhea', 'diarrhoea', 'loose stool', 'soft faeces', 'soft feces'] },
  { id: 'lethargy', displayLabel: 'Lethargy', veddraTerms: ['lethargy', 'lethargic', 'depression', 'malaise', 'listless'] },
  { id: 'anorexia', displayLabel: 'Loss of appetite (anorexia)', veddraTerms: ['anorexia', 'inappetence', 'decreased appetite', 'appetite lost', 'appetite decreased'] },
  { id: 'pruritus', displayLabel: 'Itching (pruritus)', veddraTerms: ['pruritus', 'itching', 'scratching'] },
  { id: 'seizures', displayLabel: 'Seizures', veddraTerms: ['seizure', 'convulsion', 'epilepsy'] },
  { id: 'ataxia', displayLabel: 'Ataxia (loss of coordination)', veddraTerms: ['ataxia', 'incoordination', 'unsteady', 'staggering'] },
  { id: 'tremors', displayLabel: 'Tremors', veddraTerms: ['tremor', 'shaking', 'shivering'] },
  { id: 'pu_pd', displayLabel: 'Increased thirst / urination (PU/PD)', veddraTerms: ['polyuria', 'polydipsia', 'increased thirst', 'increased urination', 'pu/pd'] },
  { id: 'weight_loss', displayLabel: 'Weight loss', veddraTerms: ['weight loss', 'weight decreased', 'cachexia', 'wasting'] },
  { id: 'hypersalivation', displayLabel: 'Excessive drooling', veddraTerms: ['hypersalivation', 'salivation', 'drooling', 'ptyalism'] },
  { id: 'dyspnea', displayLabel: 'Difficulty breathing (dyspnea)', veddraTerms: ['dyspnea', 'dyspnoea', 'respiratory distress', 'breathing difficulty', 'tachypnea'] },
  { id: 'tachycardia', displayLabel: 'Rapid heart rate (tachycardia)', veddraTerms: ['tachycardia', 'rapid heart rate', 'heart rate increased'] },
  { id: 'hematemesis', displayLabel: 'Vomiting blood (hematemesis)', veddraTerms: ['hematemesis', 'haematemesis', 'vomiting blood', 'bloody vomit'] },
  { id: 'jaundice', displayLabel: 'Jaundice (yellowing)', veddraTerms: ['jaundice', 'icterus', 'yellow mucous membrane'] },
];

const FREE_TEXT_VALUE = `__free__`;

interface CheckResult {
  matches: SymptomMatch[];
  unmatched: string[];
}

export const SymptomCheckerPage: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [petId, setPetId] = useState<string>(``);

  const [symptomChoice, setSymptomChoice] = useState<string>(COMMON_SYMPTOMS[0].id);
  const [freeText, setFreeText] = useState<string>(``);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  // Load the user pets once for the dropdown. Guests get mock pets via
  // the same endpoint, so this works for both flows.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/pets`);
        if (cancelled) return;
        const data = res.data?.data || [];
        setPets(data);
        if (data.length > 0) setPetId(data[0].id);
      } catch (e: any) {
        if (cancelled) return;
        setPetsError(e?.response?.data?.error?.message || e?.message || `Failed to load pets`);
      } finally {
        if (!cancelled) setPetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPet = useMemo(() => pets.find((p) => p.id === petId) || null, [pets, petId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setResult(null);

    if (!petId) {
      setSubmitError(`Please pick a pet first.`);
      return;
    }

    // The backend accepts either a CommonSymptom.id or free text.
    const symptom = symptomChoice === FREE_TEXT_VALUE
      ? freeText.trim()
      : symptomChoice;

    if (!symptom) {
      setSubmitError(`Please pick a symptom or enter one.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; data: SymptomCheckResponse }>(
        `/symptom-check`,
        { petId, symptom }
      );
      const data = res.data?.data;
      setResult({
        matches: data?.matches || [],
        unmatched: data?.unmatched || [],
      });
    } catch (e: any) {
      setSubmitError(
        e?.response?.data?.error?.message || e?.message || `Failed to check symptom`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <Container>
        <div className="py-8">
          <div className="mb-6 animate-fade-up">
            <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-1">
              Symptom Checker
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Cross-check what you are seeing against the FDA adverse-event list for your pet medications.
            </p>
          </div>

          <Card variant="elevated" className="mb-8 animate-fade-up">
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label htmlFor="pet" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                  Pet
                </label>
                {petsLoading ? (
                  <LoadingSpinner size="sm" />
                ) : petsError ? (
                  <Alert variant="danger">{petsError}</Alert>
                ) : pets.length === 0 ? (
                  <Alert variant="info">
                    Add a pet first — the checker uses their medications.
                  </Alert>
                ) : (
                  <Select id="pet" value={petId} onChange={(e) => setPetId(e.target.value)}>
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({(p.currentMedications || []).length} med{(p.currentMedications || []).length === 1 ? `` : `s`})
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div>
                <label htmlFor="symptom" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                  Symptom
                </label>
                <Select
                  id="symptom"
                  value={symptomChoice}
                  onChange={(e) => setSymptomChoice(e.target.value)}
                >
                  {COMMON_SYMPTOMS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayLabel}
                    </option>
                  ))}
                  <option value={FREE_TEXT_VALUE}>Other (type below)</option>
                </Select>
                {symptomChoice === FREE_TEXT_VALUE && (
                  <Input
                    type="text"
                    placeholder="Describe the symptom (e.g., trembling, hair loss)"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {submitError && (
                <Alert variant="danger">{submitError}</Alert>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || !petId || pets.length === 0}
                >
                  {submitting ? `Checking…` : `Check symptom`}
                </Button>
              </div>
            </form>
          </Card>

          {result && (
            <div className="space-y-4 animate-fade-up">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                Results for {selectedPet?.name || `your pet`}
              </h2>

              {result.matches.length === 0 ? (
                <Alert variant="info">
                  No medications on this pet had this symptom in their top reactions on FDA records.
                  That does not rule the symptom out — it just means it did not appear in the public summary.
                </Alert>
              ) : (
                result.matches.map((m) => {
                  const pct = m.totalReports > 0
                    ? Math.round((m.count / m.totalReports) * 1000) / 10
                    : 0;
                  return (
                    <Card key={m.drugId || m.drugName} variant="elevated" className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
                              {m.drugName}
                            </h3>
                            <Badge variant="warning">#{m.rank} reported</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Matched on: <span className="font-medium">{m.reactionTerm}</span>
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {m.count.toLocaleString()} of {m.totalReports.toLocaleString()} reports ({pct}%).
                          </p>
                          <p className="text-sm text-navy-900 dark:text-white mt-3">
                            If this symptom is new, getting worse, or you are unsure — call your vet.
                            Do not stop the medication on your own.
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}

              {result.unmatched.length > 0 && (
                <Card variant="default" className="p-4">
                  <details>
                    <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                      No reported match for {result.unmatched.length} medication{result.unmatched.length === 1 ? `` : `s`}
                    </summary>
                    <ul className="mt-3 list-disc pl-6 text-sm text-gray-700 dark:text-gray-300">
                      {result.unmatched.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </details>
                </Card>
              )}
            </div>
          )}

          <div className="mt-8">
            <Disclaimer variant="full" />
          </div>
        </div>
      </Container>
    </div>
  );
};
