import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Disclaimer } from '../components/common/Disclaimer';
import { SpeciesSelector } from '../components/common/SpeciesSelector';

interface Interaction {
  drugs: string[];
  severity: 'severe' | 'moderate' | 'mild';
  description: string;
  recommendation: string;
  references?: string[];
}

export const InteractionCheckerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [drugs, setDrugs] = useState<string[]>(
    searchParams.get('drugs')?.split(',').filter(Boolean) || ['', '']
  );
  const [species, setSpecies] = useState(searchParams.get('species') || 'dog');
  const [conditions, setConditions] = useState<string[]>(['']);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleAddDrug = () => setDrugs([...drugs, '']);
  const handleRemoveDrug = (index: number) => setDrugs(drugs.filter((_, i) => i !== index));
  const handleDrugChange = (index: number, value: string) => {
    const updated = [...drugs];
    updated[index] = value;
    setDrugs(updated);
  };

  const handleAddCondition = () => setConditions([...conditions, '']);
  const handleRemoveCondition = (index: number) => setConditions(conditions.filter((_, i) => i !== index));
  const handleConditionChange = (index: number, value: string) => {
    const updated = [...conditions];
    updated[index] = value;
    setConditions(updated);
  };

  const handleCheckInteractions = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);

    try {
      // Map species to API format
      const speciesMap: Record<string, string> = {
        dog: 'canine',
        cat: 'feline',
        horse: 'equine',
        bird: 'avian',
        other: 'other',
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/interactions/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drugs: validDrugs.map(name => ({ name })),
          species: speciesMap[species] || 'canine',
          conditions: conditions.filter(c => c.trim()),
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Transform API response to component format
        const transformedInteractions: Interaction[] = [];

        // Add drug-drug interactions
        if (data.data.drugInteractions) {
          data.data.drugInteractions.forEach((interaction: any) => {
            transformedInteractions.push({
              drugs: [interaction.drug1?.name, interaction.drug2?.name].filter(Boolean),
              severity: interaction.severity === 'major' || interaction.severity === 'contraindicated' ? 'severe' :
                       interaction.severity === 'moderate' ? 'moderate' : 'mild',
              description: interaction.description || 'Potential interaction detected.',
              recommendation: interaction.management || 'Consult your veterinarian.',
              references: interaction.sources?.map((s: any) => s.reference) || [],
            });
          });
        }

        // Add species interactions
        if (data.data.speciesInteractions) {
          data.data.speciesInteractions.forEach((interaction: any) => {
            transformedInteractions.push({
              drugs: [interaction.drugName],
              severity: interaction.severity === 'major' || interaction.severity === 'contraindicated' ? 'severe' :
                       interaction.severity === 'moderate' ? 'moderate' : 'mild',
              description: interaction.description || 'Species-specific concern.',
              recommendation: interaction.management || 'Consult your veterinarian.',
              references: interaction.sources?.map((s: any) => s.reference) || [],
            });
          });
        }

        // Add condition interactions
        if (data.data.conditionInteractions) {
          data.data.conditionInteractions.forEach((interaction: any) => {
            transformedInteractions.push({
              drugs: [interaction.drugName],
              severity: interaction.severity === 'major' || interaction.severity === 'contraindicated' ? 'severe' :
                       interaction.severity === 'moderate' ? 'moderate' : 'mild',
              description: `${interaction.condition}: ${interaction.description || 'Potential concern.'}`,
              recommendation: interaction.management || 'Consult your veterinarian.',
              references: interaction.sources?.map((s: any) => s.reference) || [],
            });
          });
        }

        setInteractions(transformedInteractions);
      } else {
        setInteractions([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Interaction check error:', err);
      setLoading(false);
      setInteractions([]);
    }
  };

  const getSeverityVariant = (severity: string): 'danger' | 'warning' | 'success' => {
    switch (severity) {
      case 'severe': return 'danger';
      case 'moderate': return 'warning';
      default: return 'success';
    }
  };

  const getSeverityBgClass = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800';
      case 'moderate': return 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800';
      default: return 'bg-secondary-50 dark:bg-secondary-900/20 border-secondary-200 dark:border-secondary-800';
    }
  };

  const validDrugs = drugs.filter(d => d.trim());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-2">
              Drug Interaction Checker
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Check for potential interactions between veterinary medications
            </p>
          </div>

          {/* Input Form */}
          <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <form onSubmit={handleCheckInteractions} className="p-6">
              {/* Drugs Section */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Medications to Check
                </h2>
                <div className="space-y-3">
                  {drugs.map((drug, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-md">
                        {index + 1}
                      </div>
                      <Input
                        type="text"
                        value={drug}
                        onChange={(e) => handleDrugChange(index, e.target.value)}
                        placeholder="Enter drug name (e.g., Apoquel, Bravecto)"
                        className="flex-1"
                      />
                      {drugs.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDrug(index)}
                          className="text-gray-500 hover:text-accent-600"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" onClick={handleAddDrug} className="mt-3" leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }>
                  Add Another Drug
                </Button>
              </div>

              {/* Species Selection */}
              <div className="mb-6">
                <SpeciesSelector
                  selectedSpecies={[species]}
                  onChange={(ids) => setSpecies(ids[0] || 'dog')}
                  mode="single"
                  variant="pill"
                  label="Species"
                />
              </div>

              {/* Medical Conditions */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-navy-900 dark:text-white mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Medical Conditions (Optional)
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Adding medical conditions helps identify contraindications
                </p>
                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Input
                        type="text"
                        value={condition}
                        onChange={(e) => handleConditionChange(index, e.target.value)}
                        placeholder="e.g., Kidney disease, Diabetes, Allergies"
                        className="flex-1"
                      />
                      {conditions.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveCondition(index)}>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" onClick={handleAddCondition} className="mt-3" leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }>
                  Add Condition
                </Button>
              </div>

              {/* Submit Button */}
              <Button type="submit" disabled={loading || validDrugs.length < 2} className="w-full" size="lg" leftIcon={
                loading ? <LoadingSpinner size="sm" /> : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )
              }>
                {loading ? 'Checking Interactions...' : 'Check for Interactions'}
              </Button>

              {validDrugs.length < 2 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-3">
                  Please enter at least 2 drugs to check for interactions
                </p>
              )}
            </form>
          </Card>

          {/* Results */}
          {loading && (
            <Card variant="elevated" className="animate-fade-up">
              <div className="p-12 text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Analyzing drug interactions...</p>
              </div>
            </Card>
          )}

          {!loading && hasSearched && (
            <>
              {interactions.length === 0 ? (
                <Card variant="success" className="animate-fade-up">
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-secondary-100 dark:bg-secondary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-2 font-display">
                      No Known Interactions Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Based on available data, no significant interactions were found between the
                      specified medications for {species}s.
                    </p>
                    <Alert variant="warning">
                      <strong>Important:</strong> This does not guarantee absolute safety.
                      Always consult with your veterinarian before combining medications,
                      especially when starting new treatments.
                    </Alert>
                  </div>
                </Card>
              ) : (
                <>
                  <div className="mb-6 animate-fade-up">
                    <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-2 font-display">
                      Potential Interactions Found
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} detected.
                      Review the details below and consult with your veterinarian.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {interactions.map((interaction, index) => (
                      <Card
                        key={index}
                        variant={interaction.severity === 'severe' ? 'danger' : interaction.severity === 'moderate' ? 'warning' : 'default'}
                        className="animate-fade-up"
                        style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                      >
                        <div className="p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                              interaction.severity === 'severe' ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-600' :
                              interaction.severity === 'moderate' ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-600' :
                              'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600'
                            }`}>
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-xl font-bold text-navy-900 dark:text-white">
                                  Drug Interaction
                                </h3>
                                <Badge variant={getSeverityVariant(interaction.severity)}>
                                  {interaction.severity.toUpperCase()} SEVERITY
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {interaction.drugs.map((drug, i) => (
                                  <Badge key={i} variant="outline">{drug}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-navy-900 dark:text-white mb-2">Description</h4>
                              <p className="text-gray-700 dark:text-gray-300">{interaction.description}</p>
                            </div>

                            <div className={`p-4 rounded-xl border ${getSeverityBgClass(interaction.severity)}`}>
                              <h4 className="font-semibold text-navy-900 dark:text-white mb-2">
                                Recommendation
                              </h4>
                              <p className="text-gray-700 dark:text-gray-300">{interaction.recommendation}</p>
                            </div>

                            {interaction.references && interaction.references.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-navy-900 dark:text-white mb-2">References</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                  {interaction.references.map((ref, i) => (
                                    <li key={i}>{ref}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex gap-4 justify-center animate-fade-up">
                <Button variant="outline" onClick={() => { setHasSearched(false); setInteractions([]); }}>
                  Check Different Drugs
                </Button>
                <Button variant="outline" onClick={() => navigate('/vet-finder')} leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }>
                  Find a Veterinarian
                </Button>
              </div>
            </>
          )}

          {/* Medical Disclaimer */}
          <Disclaimer variant="compact" className="mt-8" />
        </div>
      </div>
    </div>
  );
};
