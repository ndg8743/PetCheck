import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SearchBar } from '../components/common/SearchBar';
import { DrugCard } from '../components/common/DrugCard';
import { Disclaimer } from '../components/common/Disclaimer';
import { SafetyIndicator } from '../components/features/SafetyIndicator';

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
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('q')) {
      performSearch();
    }
  }, [searchParams]);

  const performSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      setTimeout(() => {
        const mockDrugs: Drug[] = [
          { id: '1', name: 'Apoquel', genericName: 'Oclacitinib', manufacturer: 'Zoetis', species: ['Dog'], totalReports: 12543, seriousReports: 3421, deathReports: 234, hasRecall: false, lastUpdated: '2024-11-15' },
          { id: '2', name: 'Bravecto', genericName: 'Fluralaner', manufacturer: 'Merck', species: ['Dog', 'Cat'], totalReports: 8932, seriousReports: 2103, deathReports: 156, hasRecall: false, lastUpdated: '2024-11-10' },
          { id: '3', name: 'Heartgard Plus', genericName: 'Ivermectin/Pyrantel', manufacturer: 'Boehringer Ingelheim', species: ['Dog'], totalReports: 4521, seriousReports: 892, deathReports: 45, hasRecall: true, lastUpdated: '2024-11-20' },
          { id: '4', name: 'Revolution Plus', genericName: 'Selamectin/Sarolaner', manufacturer: 'Zoetis', species: ['Cat'], totalReports: 3210, seriousReports: 654, deathReports: 32, hasRecall: false, lastUpdated: '2024-11-05' },
          { id: '5', name: 'Simparica', genericName: 'Sarolaner', manufacturer: 'Zoetis', species: ['Dog'], totalReports: 7654, seriousReports: 1832, deathReports: 98, hasRecall: false, lastUpdated: '2024-11-12' },
        ];

        setDrugs(mockDrugs);
        setTotalPages(Math.ceil(mockDrugs.length / itemsPerPage));
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to search drugs. Please try again.');
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.species) params.set('species', filters.species);
    if (filters.drugClass) params.set('drugClass', filters.drugClass);
    if (filters.route) params.set('route', filters.route);
    setSearchParams(params);
  };

  const handleFormSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ species: '', drugClass: '', route: '' });
    setSearchQuery('');
    setSearchParams({});
    setDrugs([]);
  };

  const getSeverityLevel = (drug: Drug): 'high' | 'moderate' | 'low' => {
    const seriousPercentage = (drug.seriousReports / drug.totalReports) * 100;
    if (seriousPercentage > 30 || drug.deathReports > 100) return 'high';
    if (seriousPercentage > 15 || drug.deathReports > 50) return 'moderate';
    return 'low';
  };

  const getSafetyScore = (drug: Drug): number => {
    const seriousPercentage = (drug.seriousReports / drug.totalReports) * 100;
    const deathPercentage = (drug.deathReports / drug.totalReports) * 100;
    return Math.max(0, Math.round(100 - seriousPercentage - (deathPercentage * 3)));
  };

  const paginatedDrugs = drugs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasFilters = filters.species || filters.drugClass || filters.route;

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

        {/* Search and Filters */}
        <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <div className="p-6">
            <form onSubmit={handleFormSearch} className="space-y-6">
              {/* Search Input */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                  Search for a drug
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <Input
                      id="search"
                      type="text"
                      placeholder="Enter drug name (e.g., Apoquel, Bravecto, Heartgard)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12"
                    />
                  </div>
                  <Button type="submit" disabled={loading} leftIcon={
                    loading ? <LoadingSpinner size="sm" /> : undefined
                  }>
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
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
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="horse">Horse</option>
                    <option value="other">Other</option>
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
                    <option value="antiparasitic">Antiparasitic</option>
                    <option value="antibiotic">Antibiotic</option>
                    <option value="anti-inflammatory">Anti-inflammatory</option>
                    <option value="pain-relief">Pain Relief</option>
                    <option value="cardiovascular">Cardiovascular</option>
                    <option value="other">Other</option>
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
                    <option value="topical">Topical</option>
                    <option value="injectable">Injectable</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>

              {hasFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters} leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }>
                  Clear Filters
                </Button>
              )}
            </form>
          </div>
        </Card>

        {/* Results */}
        {error && (
          <Alert variant="danger" className="mb-8">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={performSearch}>Try Again</Button>
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-16">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 dark:text-gray-400 mt-4">Searching drugs...</p>
          </div>
        ) : drugs.length > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <p className="text-gray-600 dark:text-gray-400">
                Found <span className="font-semibold text-navy-900 dark:text-white">{drugs.length}</span> drug{drugs.length !== 1 ? 's' : ''}
              </p>
              <Badge variant="info">{drugs.length} results</Badge>
            </div>

            <div className="space-y-4 mb-8">
              {paginatedDrugs.map((drug, index) => {
                const severity = getSeverityLevel(drug);
                const safetyScore = getSafetyScore(drug);
                return (
                  <Card
                    key={drug.id}
                    variant="elevated"
                    hover
                    className="cursor-pointer animate-fade-up"
                    style={{ animationDelay: `${0.1 + index * 0.03}s` }}
                    onClick={() => navigate(`/drugs/${drug.id}`)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-xl font-bold text-navy-900 dark:text-white">{drug.name}</h3>
                            {drug.hasRecall && (
                              <Badge variant="danger" dot>RECALL</Badge>
                            )}
                            <Badge variant={severity === 'high' ? 'danger' : severity === 'moderate' ? 'warning' : 'success'}>
                              {severity.toUpperCase()} RISK
                            </Badge>
                          </div>
                          {drug.genericName && (
                            <p className="text-gray-600 dark:text-gray-400 mb-1">
                              <span className="text-gray-500">Generic:</span> {drug.genericName}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-500">
                            Manufacturer: {drug.manufacturer}
                          </p>
                          <div className="flex gap-2 mt-3">
                            {drug.species.map((species) => (
                              <Badge key={species} variant="outline" size="sm">
                                {species}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <SafetyIndicator score={safetyScore} variant="circular" size="md" />
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 dark:bg-navy-800/50 rounded-xl">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-navy-900 dark:text-white">
                            {drug.totalReports.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Total Reports</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                            {drug.seriousReports.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Serious Events</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-accent-600 dark:text-accent-400">
                            {drug.deathReports.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Deaths Reported</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-500">
                          Last Updated: {drug.lastUpdated}
                        </span>
                        <Button variant="ghost" size="sm" rightIcon={
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        }>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  }
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'primary' : 'ghost'}
                      onClick={() => setCurrentPage(page)}
                      className="w-10"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  rightIcon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : searchParams.get('q') ? (
          <Card variant="elevated" className="animate-fade-up">
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">No Results Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Try adjusting your search terms or filters
              </p>
              <Button variant="outline" onClick={clearFilters}>Clear Search</Button>
            </div>
          </Card>
        ) : (
          <Card variant="elevated" className="animate-fade-up">
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">Search Veterinary Drugs</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Enter a drug name above to view FDA adverse event reports and safety data
              </p>
            </div>
          </Card>
        )}

        {/* Medical Disclaimer */}
        <Disclaimer variant="compact" className="mt-8" />
      </div>
    </div>
  );
};
