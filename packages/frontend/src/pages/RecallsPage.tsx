import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { LoadingScreen } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { fetchDrugSuggestions } from '../lib/suggest';
import { useUserRecalls } from '../hooks/useUserRecalls';

interface Recall {
  id: string;
  productName: string;
  manufacturer: string;
  recallDate: string;
  severity: 'high' | 'moderate' | 'low';
  reason: string;
  affectedLots?: string[];
  species: string[];
  status: 'active' | 'resolved';
  details: string;
  actionRequired: string;
}

export const RecallsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [filteredRecalls, setFilteredRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Hydrate `?q=` so direct nav / shared URLs prefill the search box.
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [severityFilter, setSeverityFilter] = useState('');
  // Default to "All" — at any given time most recalls are resolved, so an
  // "Active" default makes the page look empty on first load.
  const [statusFilter, setStatusFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [expandedRecall, setExpandedRecall] = useState<string | null>(null);
  // Native browser autocomplete options for the recall search input.
  // Refreshed as the user types so suggestions stay relevant.
  const [recallSuggestions, setRecallSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      fetchDrugSuggestions(searchQuery, 10).then((list) => {
        if (!cancelled) setRecallSuggestions(list);
      }).catch(() => {});
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery]);

  useEffect(() => {
    // Run the initial fetch with whatever ?q= we hydrated from the URL.
    fetchRecalls(searchQuery || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterRecalls();
  }, [recalls, searchQuery, severityFilter, statusFilter, speciesFilter]);

  const fetchRecalls = async (query?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('limit', '50');
      if (query) {
        params.set('query', query);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/recalls?${params}`);
      const data = await response.json();

      if (data.success && data.data?.recalls) {
        const transformedRecalls: Recall[] = data.data.recalls.map((recall: any) => ({
          id: recall.id || recall.recallNumber || Math.random().toString(),
          productName: recall.productDescription || recall.productName || 'Unknown Product',
          manufacturer: recall.recallingFirm || recall.manufacturer || 'Unknown',
          recallDate: recall.recallInitiationDate || recall.reportDate || new Date().toISOString().split('T')[0],
          severity: recall.classification === 'Class I' ? 'high' : recall.classification === 'Class II' ? 'moderate' : 'low',
          reason: recall.reasonForRecall || recall.reason || 'See details',
          affectedLots: recall.codeInfo ? [recall.codeInfo] : [],
          species: recall.species || ['Dog', 'Cat'],
          status: recall.status?.toLowerCase() === 'ongoing' ? 'active' : 'resolved',
          details: recall.productDescription || recall.details || '',
          actionRequired: recall.voluntaryMandated || 'Contact your veterinarian if you have this product.',
        }));
        setRecalls(transformedRecalls);
      } else {
        setRecalls([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch recalls:', err);
      setRecalls([]);
      setLoading(false);
    }
  };

  const filterRecalls = () => {
    let filtered = [...recalls];
    if (searchQuery) {
      filtered = filtered.filter(recall =>
        recall.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recall.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recall.reason.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (severityFilter) filtered = filtered.filter(recall => recall.severity === severityFilter);
    if (statusFilter) filtered = filtered.filter(recall => recall.status === statusFilter);
    if (speciesFilter) {
      filtered = filtered.filter(recall =>
        recall.species.some(s => s.toLowerCase() === speciesFilter.toLowerCase())
      );
    }
    setFilteredRecalls(filtered);
  };

  const toggleRecallDetails = (recallId: string) => {
    setExpandedRecall(expandedRecall === recallId ? null : recallId);
  };

  // Don't lock the page behind a full-screen loader once we've already
  // loaded recalls once. Filter changes happen client-side, so re-fetches
  // are rare; the inline state is enough.
  if (loading && recalls.length === 0) {
    return <LoadingScreen message="Loading recalls..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full">
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-accent-600 dark:text-accent-400 mb-4 font-medium">{error}</p>
            <Button onClick={() => fetchRecalls()}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  const activeRecalls = recalls.filter(r => r.status === 'active');
  const highSeverityCount = activeRecalls.filter(r => r.severity === 'high').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-2">Veterinary Product Recalls</h1>
          <p className="text-gray-600 dark:text-gray-400">
            FDA-wide recalls affecting veterinary medications and products. Add pets to your profile to see which recalls apply to your medications.
          </p>
        </div>

        {/* "Your pets at risk" banner — shown only when at least one of the
            user's pet's current medications is named in an active recall. */}
        <PetAtRiskBanner />

        {/* Alert Banner */}
        {highSeverityCount > 0 && (
          <Alert variant="danger" className="mb-6 animate-fade-up" style={{ animationDelay: '0.05s' }} icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }>
            <div>
              <h3 className="font-semibold">
                {highSeverityCount} High-Severity Active Recall{highSeverityCount !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm opacity-90">
                Immediate action may be required. Review high-severity recalls below.
              </p>
            </div>
          </Alert>
        )}

        {/* Stats — totals across the entire FDA veterinary recall feed, not user-specific */}
        <div className="mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          FDA recall totals (all veterinary products)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <Card variant="elevated" className="p-4 text-center">
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{recalls.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Recalls</div>
          </Card>
          <Card variant="elevated" className="p-4 text-center">
            <div className="text-3xl font-bold text-warning-600 dark:text-warning-400">{activeRecalls.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Recalls</div>
          </Card>
          <Card variant="elevated" className="p-4 text-center">
            <div className="text-3xl font-bold text-accent-600 dark:text-accent-400">{highSeverityCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">High Severity</div>
          </Card>
          <Card variant="elevated" className="p-4 text-center">
            <div className="text-3xl font-bold text-secondary-600 dark:text-secondary-400">
              {recalls.filter(r => r.status === 'resolved').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card variant="elevated" className="mb-6 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <div className="p-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              fetchRecalls(searchQuery);
              const next = new URLSearchParams(searchParams);
              if (searchQuery.trim()) next.set('q', searchQuery.trim()); else next.delete('q');
              setSearchParams(next);
            }} className="grid md:grid-cols-6 gap-4">
              <div className="md:col-span-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder="Search recalls (e.g., Apoquel, Heartgard)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  list="recall-search-suggestions"
                  autoComplete="off"
                />
                <datalist id="recall-search-suggestions">
                  {recallSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
              </Select>
              <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                <option value="">All Severity</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </Select>
              <Select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)}>
                <option value="">All Species</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="horse">Horse</option>
              </Select>
              <Button type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </div>
        </Card>

        {/* Recalls List */}
        {filteredRecalls.length === 0 ? (
          (() => {
            const hasActiveFilter = !!(searchQuery || severityFilter || statusFilter || speciesFilter);
            return (
              <Card variant="elevated" className="animate-fade-up">
                <EmptyState
                  title="No Recalls Found"
                  description={hasActiveFilter ? 'Try adjusting your filters or search terms.' : 'There are no FDA veterinary recalls matching your view right now.'}
                  action={hasActiveFilter ? { label: 'Clear Filters', onClick: () => { setSearchQuery(''); setSeverityFilter(''); setStatusFilter(''); setSpeciesFilter(''); } } : undefined}
                />
              </Card>
            );
          })()
        ) : (
          <div className="space-y-4">
            {filteredRecalls.map((recall, index) => (
              <Card
                key={recall.id}
                variant={recall.severity === 'high' ? 'danger' : recall.severity === 'moderate' ? 'warning' : 'default'}
                className="animate-fade-up overflow-hidden"
                style={{ animationDelay: `${Math.min(0.05 + index * 0.015, 0.3)}s` }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-navy-900 dark:text-white">{recall.productName}</h3>
                        <Badge variant={recall.severity === 'high' ? 'danger' : recall.severity === 'moderate' ? 'warning' : 'secondary'}>
                          {recall.severity.toUpperCase()}
                        </Badge>
                        <Badge variant={recall.status === 'active' ? 'primary' : 'outline'}>
                          {recall.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{recall.manufacturer}</p>
                      <div className="flex gap-2 mb-2">
                        {recall.species.map((species) => (
                          <Badge key={species} variant="outline" size="sm">{species}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-500">Recall Date: {recall.recallDate}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-navy-900 dark:text-white mb-1">Reason for Recall</h4>
                    <p className="text-gray-700 dark:text-gray-300">{recall.reason}</p>
                  </div>

                  {expandedRecall === recall.id && (
                    <div className="space-y-4 mb-4 pt-4 border-t border-gray-200 dark:border-navy-700">
                      <div>
                        <h4 className="font-semibold text-navy-900 dark:text-white mb-1">Details</h4>
                        <p className="text-gray-700 dark:text-gray-300">{recall.details}</p>
                      </div>

                      {recall.affectedLots && recall.affectedLots.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-navy-900 dark:text-white mb-2">Affected Lot Numbers</h4>
                          <div className="flex flex-wrap gap-2">
                            {recall.affectedLots.map((lot) => (
                              <Badge key={lot} variant="outline">{lot}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Alert variant={recall.severity === 'high' ? 'danger' : recall.severity === 'moderate' ? 'warning' : 'info'}>
                        <div>
                          <h4 className="font-semibold mb-1">Action Required</h4>
                          <p className="text-sm">{recall.actionRequired}</p>
                        </div>
                      </Alert>
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => toggleRecallDetails(recall.id)} rightIcon={
                      <svg className={`w-4 h-4 transition-transform ${expandedRecall === recall.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    }>
                      {expandedRecall === recall.id ? 'Hide Details' : 'View Full Details'}
                    </Button>
                    {recall.status === 'active' && (
                      <Button variant="ghost" size="sm" onClick={() => navigate('/vet-finder')} leftIcon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      }>
                        Find a Veterinarian
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info Box */}
        <Alert variant="info" className="mt-8 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <strong>Stay Informed:</strong> This page is regularly updated with the latest FDA recalls.
          Subscribe to notifications in your profile settings to receive alerts about recalls affecting your pets' medications.
        </Alert>
      </div>
    </div>
  );
};

/**
 * Banner that surfaces FDA recalls affecting any of the user's pets'
 * active medications. Hidden when there are no matches or the user is
 * unauthenticated.
 */
const PetAtRiskBanner: React.FC = () => {
  const { matches, totalAffectedPets, loading } = useUserRecalls();
  if (loading || matches.length === 0) return null;

  const petNames = Array.from(
    new Set(matches.flatMap((m) => m.affectedPets.map((p) => p.petName)))
  );
  const petSummary =
    petNames.length === 1
      ? petNames[0]
      : petNames.length === 2
        ? `${petNames[0]} and ${petNames[1]}`
        : `${petNames.slice(0, -1).join(', ')}, and ${petNames[petNames.length - 1]}`;

  return (
    <Alert
      variant="danger"
      className="mb-6 animate-fade-up"
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      }
    >
      <div>
        <h3 className="font-semibold">
          {matches.length} active recall{matches.length !== 1 ? 's' : ''}{' '}
          affect{totalAffectedPets === 1 ? 's' : ''} {petSummary}
        </h3>
        <ul className="text-sm opacity-90 mt-2 space-y-1">
          {matches.slice(0, 3).map((m) => (
            <li key={m.recall.id}>
              <strong>{m.recall.productName}</strong> — affects{' '}
              {m.affectedPets.map((p) => `${p.petName} (${p.medicationName})`).join(', ')}
            </li>
          ))}
          {matches.length > 3 && (
            <li className="opacity-70">+ {matches.length - 3} more — see full list below.</li>
          )}
        </ul>
      </div>
    </Alert>
  );
};