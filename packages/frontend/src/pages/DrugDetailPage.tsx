import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { LoadingScreen } from '../components/ui/LoadingSpinner';
import { Container } from '../components/ui/Container';
import { EmptyState } from '../components/ui/EmptyState';
import { SafetyIndicator } from '../components/features/SafetyIndicator';
import { Disclaimer } from '../components/common/Disclaimer';
import { TabButtons } from '../components/ui/Tabs';

interface DrugDetail {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  species: string[];
  description: string;
  indications: string[];
  warnings: string[];
  totalReports: number;
  seriousReports: number;
  deathReports: number;
  hasRecall: boolean;
  recallDetails?: {
    date: string;
    reason: string;
    severity: string;
  };
  lastUpdated: string;
}

interface AdverseEvent {
  category: string;
  count: number;
  percentage: number;
}

interface SpeciesBreakdown {
  species: string;
  totalReports: number;
  percentage: number;
}

export const DrugDetailPage: React.FC = () => {
  const { drugId } = useParams<{ drugId: string }>();
  const navigate = useNavigate();
  const [drug, setDrug] = useState<DrugDetail | null>(null);
  const [adverseEvents, setAdverseEvents] = useState<AdverseEvent[]>([]);
  const [speciesData, setSpeciesData] = useState<SpeciesBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionDrugs, setInteractionDrugs] = useState<string[]>(['']);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDrugDetails();
  }, [drugId]);

  const fetchDrugDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      let drugData = null;

      // First try to get by ID
      const drugResponse = await fetch(`${apiUrl}/drugs/${encodeURIComponent(drugId || '')}`);
      const drugResult = await drugResponse.json();

      if (drugResult.success && drugResult.data) {
        drugData = drugResult.data;
      } else {
        // If not found by ID, try by name
        const nameResponse = await fetch(`${apiUrl}/drugs/name/${encodeURIComponent(drugId || '')}`);
        const nameResult = await nameResponse.json();
        if (nameResult.success && nameResult.data) {
          drugData = nameResult.data;
        }
      }

      if (!drugData) {
        setError('Drug not found');
        setLoading(false);
        return;
      }

      const drugName = drugData.tradeName || drugData.genericName || drugId;
      const genericName = drugData.genericName || drugData.activeIngredients?.[0]?.name;

      // Fetch adverse events summary
      const aeUrl = new URL(`${apiUrl}/adverse-events/summary/${encodeURIComponent(drugName)}`);
      if (genericName && genericName !== drugName) {
        aeUrl.searchParams.set('genericName', genericName);
      }
      const aeResponse = await fetch(aeUrl.toString());
      const aeResult = await aeResponse.json();
      const aeSummary = aeResult.success ? aeResult.data : null;

      const totalReports = drugData.totalReports || aeSummary?.totalReports || 0;
      const seriousReports = drugData.seriousReports || aeSummary?.seriousReports || 0;
      const deathReports = drugData.deathReports || aeSummary?.deathReports || 0;

      setDrug({
        id: drugData.id || drugId || '',
        name: drugData.tradeName || drugData.genericName || 'Unknown',
        genericName: drugData.genericName || drugData.activeIngredients?.[0]?.name || '',
        manufacturer: drugData.manufacturer || 'Unknown',
        species: drugData.approvedSpecies?.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)) || [],
        description: drugData.description ||
          (drugData.indications?.length > 0 ? drugData.indications.join('. ') + '.' :
          `Veterinary ${drugData.drugClass?.[0] || 'medication'} for ${(drugData.approvedSpecies || []).join(', ') || 'animals'}.`),
        indications: drugData.indications || [
          `Approved for use in ${(drugData.approvedSpecies || []).join(', ') || 'animals'}`,
        ].filter(Boolean),
        warnings: drugData.warnings || [
          'Always consult with a veterinarian before use',
          'Follow dosage instructions carefully',
          'Monitor for adverse reactions',
        ],
        totalReports,
        seriousReports,
        deathReports,
        hasRecall: drugData.hasActiveRecall || false,
        recallDetails: drugData.recallDetails,
        lastUpdated: drugData.lastUpdated ? new Date(drugData.lastUpdated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      });

      if (aeSummary?.topReactions && aeSummary.topReactions.length > 0) {
        const totalReactions = aeSummary.topReactions.reduce((sum: number, r: any) => sum + r.count, 0);
        setAdverseEvents(aeSummary.topReactions.map((reaction: any) => ({
          category: reaction.term || reaction.reaction || 'Unknown',
          count: reaction.count,
          percentage: totalReactions > 0 ? Math.round((reaction.count / totalReactions) * 1000) / 10 : 0,
        })));
      } else {
        setAdverseEvents([]);
      }

      if (aeSummary?.speciesBreakdown && aeSummary.speciesBreakdown.length > 0) {
        const totalSpecies = aeSummary.speciesBreakdown.reduce((sum: number, s: any) => sum + s.count, 0);
        setSpeciesData(aeSummary.speciesBreakdown.map((species: any) => ({
          species: species.term || species.species || 'Unknown',
          totalReports: species.count,
          percentage: totalSpecies > 0 ? Math.round((species.count / totalSpecies) * 1000) / 10 : 0,
        })));
      } else {
        setSpeciesData((drugData.approvedSpecies || []).map((species: string) => ({
          species,
          totalReports: 0,
          percentage: 0,
        })));
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching drug details:', err);
      setError('Failed to load drug details. Please try again.');
      setLoading(false);
    }
  };

  const handleCheckInteractions = () => {
    const drugs = [drug?.name, ...interactionDrugs].filter(Boolean).join(',');
    navigate(`/interactions?drugs=${encodeURIComponent(drugs)}`);
  };

  const addInteractionDrug = () => {
    setInteractionDrugs([...interactionDrugs, '']);
  };

  const updateInteractionDrug = (index: number, value: string) => {
    const updated = [...interactionDrugs];
    updated[index] = value;
    setInteractionDrugs(updated);
  };

  const removeInteractionDrug = (index: number) => {
    setInteractionDrugs(interactionDrugs.filter((_, i) => i !== index));
  };

  const getSafetyScore = (): number => {
    if (!drug || drug.totalReports === 0) return 100;
    const seriousPercentage = (drug.seriousReports / drug.totalReports) * 100;
    const deathPercentage = (drug.deathReports / drug.totalReports) * 100;
    return Math.max(0, Math.round(100 - seriousPercentage - (deathPercentage * 3)));
  };

  const getPercentage = (value: number, total: number): string => {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  };

  if (loading && !drug) {
    return <LoadingScreen message="Loading drug details..." />;
  }

  if (error || !drug) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center p-4">
        <Container size="sm">
          <EmptyState
            icon={<svg className="w-8 h-8 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
            title={error || 'Drug not found'}
            action={{
              label: 'Back to Search',
              onClick: () => navigate('/drugs/search'),
            }}
          />
        </Container>
      </div>
    );
  }

  const safetyScore = getSafetyScore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <Container>
        <div className="py-8">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-6 animate-fade-up"
            leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>}
          >
            Back
          </Button>

          {/* Drug Info Header */}
          <Card className="mb-8 animate-fade-up">
            <div className="p-6 lg:p-8">
              <div className="flex items-start justify-between gap-6 mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display">{drug.name}</h1>
                    {drug.hasRecall && (
                      <Badge variant="danger">ACTIVE RECALL</Badge>
                    )}
                  </div>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">Generic: {drug.genericName}</p>
                  <p className="text-gray-500 dark:text-gray-500">Manufacturer: {drug.manufacturer}</p>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {drug.species.map((species) => (
                      <Badge key={species} variant="outline">
                        {species}
                      </Badge>
                    ))}
                  </div>
                </div>
                <SafetyIndicator score={safetyScore} variant="circular" size="lg" showLabel />
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <Card className="p-4 text-center bg-gray-50 dark:bg-navy-800/50">
                  <div className="text-3xl font-bold text-navy-900 dark:text-white">{drug.totalReports.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Adverse Event Reports</div>
                </Card>
                <Card className="p-4 text-center bg-warning-50 dark:bg-warning-900/20">
                  <div className="text-3xl font-bold text-warning-600 dark:text-warning-400">{drug.seriousReports.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Serious Events ({getPercentage(drug.seriousReports, drug.totalReports)}%)
                  </div>
                </Card>
                <Card className="p-4 text-center bg-accent-50 dark:bg-accent-900/20">
                  <div className="text-3xl font-bold text-accent-600 dark:text-accent-400">{drug.deathReports.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Deaths Reported ({getPercentage(drug.deathReports, drug.totalReports)}%)
                  </div>
                </Card>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">Last Updated: {drug.lastUpdated}</p>
            </div>
          </Card>

          {/* Recall Alert */}
          {drug.hasRecall && drug.recallDetails && (
            <Alert variant="danger" className="mb-8 animate-fade-up">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-2">Active Recall</h2>
                  <p className="mb-2">{drug.recallDetails.reason}</p>
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <span>Date: {drug.recallDetails.date}</span>
                    <Badge variant="danger">{drug.recallDetails.severity}</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/recalls')}>
                    View Full Recall Details
                  </Button>
                </div>
              </div>
            </Alert>
          )}

          {/* Tabbed Content */}
          <div className="mb-8 animate-fade-up">
            <TabButtons
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'adverse-events', label: 'Adverse Events' },
                { id: 'interactions', label: 'Check Interactions' },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            <div className="mt-6">
              {activeTab === 'overview' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Description
                      </h2>
                      <p className="text-gray-700 dark:text-gray-300 mb-6">{drug.description}</p>

                      <h3 className="font-semibold text-navy-900 dark:text-white mb-3">Indications</h3>
                      <ul className="space-y-2 mb-6">
                        {drug.indications.map((indication, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                            <svg className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {indication}
                          </li>
                        ))}
                      </ul>

                      <h3 className="font-semibold text-navy-900 dark:text-white mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Warnings & Precautions
                      </h3>
                      <ul className="space-y-2">
                        {drug.warnings.map((warning, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning-500 flex-shrink-0 mt-2"></span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Species Breakdown
                      </h2>
                      <div className="space-y-4">
                        {speciesData.map((data) => (
                          <div key={data.species}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-navy-900 dark:text-white">{data.species}</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {data.totalReports.toLocaleString()} reports ({data.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-navy-700 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all"
                                style={{ width: `${data.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'adverse-events' && (
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-navy-900 dark:text-white mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Adverse Event Summary
                    </h2>

                    {adverseEvents.length > 0 ? (
                      <>
                        <div className="space-y-4 mb-6">
                          {adverseEvents.map((event) => (
                            <div key={event.category}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-navy-900 dark:text-white">{event.category}</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {event.count.toLocaleString()} ({event.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-navy-700 rounded-full h-4">
                                <div
                                  className={`h-4 rounded-full transition-all ${
                                    event.category === 'Death'
                                      ? 'bg-accent-500'
                                      : 'bg-gradient-to-r from-primary-500 to-secondary-500'
                                  }`}
                                  style={{ width: `${event.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <Alert variant="info">
                          <strong>Note:</strong> Adverse event reports do not establish causation.
                          A drug may be reported in connection with an adverse event, but that does not
                          mean the drug caused the event.
                        </Alert>
                      </>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">No adverse events reported for this drug.</p>
                    )}
                  </div>
                </Card>
              )}

              {activeTab === 'interactions' && (
                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Check Drug Interactions
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Add other medications to check for potential interactions with {drug.name}
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3">
                        <Input
                          type="text"
                          value={drug.name}
                          disabled
                          className="flex-1 bg-gray-100 dark:bg-navy-800"
                        />
                        <Badge variant="primary">Current Drug</Badge>
                      </div>

                      {interactionDrugs.map((drugName, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Input
                            type="text"
                            placeholder="Enter drug name"
                            value={drugName}
                            onChange={(e) => updateInteractionDrug(index, e.target.value)}
                            className="flex-1"
                          />
                          <Button variant="ghost" size="sm" onClick={() => removeInteractionDrug(index)}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={addInteractionDrug} leftIcon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      }>
                        Add Another Drug
                      </Button>
                      <Button
                        onClick={handleCheckInteractions}
                        disabled={interactionDrugs.every(d => !d.trim())}
                      >
                        Check Interactions
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Medical Disclaimer */}
          <Disclaimer variant="full" className="animate-fade-up" />
        </div>
      </Container>
    </div>
  );
};
