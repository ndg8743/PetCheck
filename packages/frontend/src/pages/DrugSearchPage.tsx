import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Disclaimer } from '../components/common/Disclaimer';
import { SearchBar } from '../components/common/SearchBar';
import { SafetyIndicator } from '../components/features/SafetyIndicator';
import { fetchDrugSuggestions } from '../lib/suggest';

interface Drug {
  id: string;
  name: string;
  genericName?: string;
  manufacturer: string;
  species: string[];
  totalReports: number;
  seriousReports: number;
  deathReports: number;
  hasRecall: boolean;
  lastUpdated: string;
}

export const DrugSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    species: searchParams.get('species') || '',
    drugClass: searchParams.get('drugClass') || '',
    route: searchParams.get('route') || '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const itemsPerPage = 20;
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchParams.get('q')) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const performSearch = async () => {
    const query = searchParams.get('q') || '';
    if (!query.trim()) {
      setDrugs([]);
      setTotalResults(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('query', query);
      params.set('limit', itemsPerPage.toString());
      params.set('offset', ((currentPage - 1) * itemsPerPage).toString());
      if (filters.species) params.set('species', filters.species);
      if (filters.drugClass) params.set('drugClass', filters.drugClass);
      if (filters.route) params.set('route', filters.route);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/drugs?${params}`);
      const data = await response.json();

      if (data.success && data.data) {
        // The API response can have drugs at data.data or data.data.drugs
        const drugsList = Array.isArray(data.data) ? data.data : data.data.drugs || [];
        
        const transformedDrugs: Drug[] = drugsList.map((drug: any) => ({
          id: drug.id,
          name: drug.tradeName || drug.genericName || 'Unknown',
          genericName: drug.genericName || drug.activeIngredients?.[0]?.name || '',
          manufacturer: drug.manufacturer || 'Unknown',
          species: drug.approvedSpecies || [],
          totalReports: drug.totalReports || 0,
          seriousReports: drug.seriousReports || 0,
          deathReports: drug.deathReports || 0,
          hasRecall: drug.hasActiveRecall || false,
          lastUpdated: drug.lastUpdated || new Date().toISOString(),
        }));

        setDrugs(transformedDrugs);
        setTotalResults(data.meta?.total || drugsList.length);
      } else {
        setDrugs([]);
        setTotalResults(0);
        if (data.error?.message) {
          setError(data.error.message);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search drugs. Please try again.');
      setDrugs([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setCurrentPage(1);
    setSearchQuery(query);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.species) params.set('species', filters.species);
    if (filters.drugClass) params.set('drugClass', filters.drugClass);
    if (filters.route) params.set('route', filters.route);
    setSearchParams(params);
  };

  const handleFilterChange = (key: string, value: string) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ species: '', drugClass: '', route: '' });
    setSearchQuery('');
    setSearchParams({});
    setDrugs([]);
    setTotalResults(0);
  };


  const getSafetyScore = (drug: Drug): number => {
    if (drug.totalReports === 0) return 100;
    const seriousPercentage = (drug.seriousReports / drug.totalReports) * 100;
    const deathPercentage = (drug.deathReports / drug.totalReports) * 100;
    return Math.max(0, Math.round(100 - seriousPercentage - (deathPercentage * 3)));
  };

  const hasFilters = filters.species || filters.drugClass || filters.route;
  const totalPages = Math.ceil(totalResults / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-2">Drug Safety Search</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search FDA adverse event reports for veterinary drugs
          </p>
        </div>

        {/* Search and Filters — SearchBar manages its own form internally,
            so we use a plain div wrapper here (nested forms broke the icon-
            button submit). */}
        <Card variant="elevated" className="mb-8 animate-fade-up">
          <div className="p-6">
            <div className="space-y-6">
              {/* Search Input — autocomplete shows popular drugs on focus,
                  prefix/substring matches as you type. */}
              <div>
                <label className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                  Search for a drug
                </label>
                <SearchBar
                  placeholder="Enter drug name (e.g., Apoquel, Bravecto, Heartgard)"
                  onSearch={handleSearch}
                  isLoading={loading}
                  fetchSuggestions={fetchDrugSuggestions}
                  initialQuery={searchQuery}
                />
              </div>

              {/* Filters */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="species" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                    Species
                  </label>
                  <Select
                    id="species"
                    value={filters.species}
                    onChange={(e) => handleFilterChange('species', e.target.value)}
                  >
                    <option value="">All Species</option>
                    <option value="canine">Dogs</option>
                    <option value="feline">Cats</option>
                    <option value="equine">Horses</option>
                    <option value="avian">Birds</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="drugClass" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                    Drug Class
                  </label>
                  <Select
                    id="drugClass"
                    value={filters.drugClass}
                    onChange={(e) => handleFilterChange('drugClass', e.target.value)}
                  >
                    <option value="">All Classes</option>
                    <option value="antibiotic">Antibiotic</option>
                    <option value="analgesic">Analgesic</option>
                    <option value="antiparasitic">Antiparasitic</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="route" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                    Route
                  </label>
                  <Select
                    id="route"
                    value={filters.route}
                    onChange={(e) => handleFilterChange('route', e.target.value)}
                  >
                    <option value="">All Routes</option>
                    <option value="oral">Oral</option>
                    <option value="injection">Injection</option>
                    <option value="topical">Topical</option>
                  </Select>
                </div>
              </div>

              {hasFilters && (
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" onClick={clearFilters} size="sm">
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Results Info */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 animate-fade-up">
            {loading && 'Searching...'}
            {!loading && totalResults > 0 && (
              <>Showing 1-{Math.min(itemsPerPage, drugs.length)} of {totalResults} results</>
            )}
            {!loading && totalResults === 0 && drugs.length === 0 && 'No results found'}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" className="mb-6 animate-fade-up">
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4 animate-fade-up">
            {[1, 2, 3].map(i => (
              <Card key={i} variant="elevated" className="p-6">
                <div className="space-y-3">
                  <Skeleton height={24} className="w-1/3" />
                  <Skeleton height={20} className="w-2/3" />
                  <Skeleton height={20} />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && drugs.length > 0 && (
          <>
            <div className="space-y-4 animate-fade-up">
              {drugs.map((drug, index) => {
                
                const score = getSafetyScore(drug);
                return (
                  <Card
                    key={drug.id}
                    variant="elevated"
                    hover
                    onClick={() => navigate(`/drugs/${drug.id}`)}
                    className="p-6 cursor-pointer transition-all"
                    style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
                  >
                    <div className="flex items-start gap-6">
                      <SafetyIndicator score={score} variant="circular" size="md" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
                              {drug.name}
                            </h3>
                            {drug.genericName && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Generic: {drug.genericName}
                              </p>
                            )}
                          </div>
                          {drug.hasRecall && (
                            <Badge variant="danger" dot>RECALL</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {drug.manufacturer}
                        </p>
                        <div className="flex gap-2 mb-3">
                          {drug.species.slice(0, 3).map(s => (
                            <Badge key={s} variant="outline" size="sm">
                              {s}
                            </Badge>
                          ))}
                          {drug.species.length > 3 && (
                            <Badge variant="outline" size="sm">
                              +{drug.species.length - 3}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-lg font-bold text-navy-900 dark:text-white">
                              {drug.totalReports.toLocaleString()}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">Total Reports</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-warning-600 dark:text-warning-400">
                              {drug.seriousReports.toLocaleString()}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">Serious</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-accent-600 dark:text-accent-400">
                              {drug.deathReports.toLocaleString()}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">Deaths</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2 animate-fade-up">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(currentPage - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  size="sm"
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage(currentPage + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && drugs.length === 0 && !error && (
          <EmptyState
            icon={
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            title={searchQuery ? 'No drugs found' : 'Search for a drug'}
            description={
              searchQuery
                ? 'Try a different search term or check the spelling'
                : 'Enter a drug name above to search FDA adverse event reports'
            }
          />
        )}
      </div>

      {/* Disclaimer */}
      <section className="py-8 bg-gray-100 dark:bg-navy-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Disclaimer variant="inline" />
        </div>
      </section>
    </div>
  );
};
