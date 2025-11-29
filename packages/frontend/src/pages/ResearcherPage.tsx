import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Disclaimer } from '../components/common/Disclaimer';

interface QueryFilter {
  drugName?: string;
  species?: string;
  startDate?: string;
  endDate?: string;
  seriousOnly?: boolean;
  outcomeType?: string;
}

interface AdverseEventRecord {
  reportId: string;
  drugName: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  sex: string;
  adverseEvent: string;
  outcome: string;
  reportDate: string;
  serious: boolean;
}

export const ResearcherPage: React.FC = () => {
  const [filters, setFilters] = useState<QueryFilter>({
    drugName: '',
    species: '',
    startDate: '',
    endDate: '',
    seriousOnly: false,
    outcomeType: '',
  });
  const [results, setResults] = useState<AdverseEventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [aggregationType, setAggregationType] = useState<'none' | 'drug' | 'species' | 'event'>('none');

  const handleFilterChange = (key: keyof QueryFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);

    try {
      setTimeout(() => {
        const mockResults: AdverseEventRecord[] = Array.from({ length: 50 }, (_, i) => ({
          reportId: `AER-2024-${10000 + i}`,
          drugName: ['Apoquel', 'Bravecto', 'Heartgard', 'Simparica'][i % 4],
          species: ['Dog', 'Cat'][i % 2],
          breed: ['Golden Retriever', 'Labrador', 'Beagle', 'Siamese', 'Persian'][i % 5],
          age: Math.floor(Math.random() * 15) + 1,
          weight: Math.floor(Math.random() * 80) + 10,
          sex: ['Male', 'Female'][i % 2],
          adverseEvent: ['Vomiting', 'Diarrhea', 'Lethargy', 'Loss of Appetite', 'Seizure'][i % 5],
          outcome: ['Recovered', 'Recovering', 'Death', 'Unknown'][i % 4],
          reportDate: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          serious: Math.random() > 0.7,
        }));
        setResults(mockResults);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setLoading(false);
      alert('Failed to fetch data. Please try again.');
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (results.length === 0) {
      alert('No data to export');
      return;
    }

    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === 'csv') {
      const headers = Object.keys(results[0]).join(',');
      const rows = results.map(r => Object.values(r).join(','));
      content = [headers, ...rows].join('\n');
      mimeType = 'text/csv';
      filename = `petcheck_export_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      content = JSON.stringify(results, null, 2);
      mimeType = 'application/json';
      filename = `petcheck_export_${new Date().toISOString().split('T')[0]}.json`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getAggregatedData = () => {
    if (aggregationType === 'none') return null;
    const grouped: Record<string, number> = {};
    results.forEach(record => {
      let key: string;
      switch (aggregationType) {
        case 'drug': key = record.drugName; break;
        case 'species': key = record.species; break;
        case 'event': key = record.adverseEvent; break;
        default: return;
      }
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  };

  const aggregatedData = getAggregatedData();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-2">
              Research Tools
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Advanced query builder for FDA adverse event database analysis
            </p>
          </div>

          {/* Query Builder */}
          <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <form onSubmit={handleSearch} className="p-6">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Query Builder
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-navy-900 dark:text-white mb-2">Drug Name</label>
                  <Input
                    type="text"
                    value={filters.drugName}
                    onChange={(e) => handleFilterChange('drugName', e.target.value)}
                    placeholder="e.g., Apoquel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-900 dark:text-white mb-2">Species</label>
                  <Select value={filters.species} onChange={(e) => handleFilterChange('species', e.target.value)}>
                    <option value="">All Species</option>
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="horse">Horse</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-900 dark:text-white mb-2">Outcome Type</label>
                  <Select value={filters.outcomeType} onChange={(e) => handleFilterChange('outcomeType', e.target.value)}>
                    <option value="">All Outcomes</option>
                    <option value="recovered">Recovered</option>
                    <option value="recovering">Recovering</option>
                    <option value="death">Death</option>
                    <option value="unknown">Unknown</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-900 dark:text-white mb-2">Start Date</label>
                  <Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-900 dark:text-white mb-2">End Date</label>
                  <Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.seriousOnly || false}
                      onChange={(e) => handleFilterChange('seriousOnly', e.target.checked)}
                      className="w-5 h-5 text-primary-600 bg-white dark:bg-navy-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                    />
                    <span className="font-medium text-navy-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      Serious events only
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} leftIcon={
                  loading ? <LoadingSpinner size="sm" /> : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )
                }>
                  {loading ? 'Running Query...' : 'Run Query'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFilters({ drugName: '', species: '', startDate: '', endDate: '', seriousOnly: false, outcomeType: '' });
                    setResults([]);
                    setHasSearched(false);
                  }}
                >
                  Clear
                </Button>
              </div>
            </form>
          </Card>

          {/* Results */}
          {loading && (
            <Card variant="elevated" className="animate-fade-up">
              <div className="p-12 text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Querying database...</p>
              </div>
            </Card>
          )}

          {!loading && hasSearched && results.length > 0 && (
            <>
              {/* Results Header */}
              <Card variant="elevated" className="mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                        Results ({results.length} records)
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleExport('csv')} leftIcon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      }>
                        Export CSV
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport('json')} leftIcon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      }>
                        Export JSON
                      </Button>
                    </div>
                  </div>

                  {/* Aggregation Controls */}
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-navy-900 dark:text-white mb-2">Aggregate By</label>
                    <Select value={aggregationType} onChange={(e) => setAggregationType(e.target.value as any)}>
                      <option value="none">No Aggregation</option>
                      <option value="drug">Drug Name</option>
                      <option value="species">Species</option>
                      <option value="event">Adverse Event</option>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Aggregated View */}
              {aggregatedData && (
                <Card variant="elevated" className="mb-6 animate-fade-up" style={{ animationDelay: '0.15s' }}>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4">
                      Aggregated Data
                    </h3>
                    <div className="space-y-4">
                      {aggregatedData.map(({ key, count }) => (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-navy-900 dark:text-white">{key}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {count} ({((count / results.length) * 100).toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-navy-700 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all"
                              style={{ width: `${(count / results.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Raw Data Table */}
              <Card variant="elevated" className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4">Raw Data</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-navy-800">
                        <tr>
                          {['Report ID', 'Drug', 'Species', 'Breed', 'Adverse Event', 'Outcome', 'Date', 'Serious'].map((header) => (
                            <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-navy-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {results.slice(0, 100).map((record) => (
                          <tr key={record.reportId} className="hover:bg-gray-50 dark:hover:bg-navy-800/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-navy-900 dark:text-white">{record.reportId}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{record.drugName}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{record.species}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{record.breed}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{record.adverseEvent}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{record.outcome}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{record.reportDate}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {record.serious ? (
                                <Badge variant="danger" size="sm">Yes</Badge>
                              ) : (
                                <Badge variant="secondary" size="sm">No</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {results.length > 100 && (
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                      Showing first 100 of {results.length} results. Export data to view all records.
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <Card variant="elevated" className="animate-fade-up">
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">
                  No Results Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your query filters to see results
                </p>
              </div>
            </Card>
          )}

          {!hasSearched && (
            <Card variant="elevated" className="animate-fade-up">
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">
                  Advanced Research Tools
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Build custom queries to analyze FDA adverse event data
                </p>
                <div className="max-w-2xl mx-auto text-left">
                  <h4 className="font-semibold text-navy-900 dark:text-white mb-3">Features:</h4>
                  <ul className="space-y-2">
                    {[
                      'Filter by drug name, species, date range, and outcome type',
                      'Aggregate data by drug, species, or adverse event',
                      'Export results in CSV or JSON format',
                      'View raw adverse event report data',
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <svg className="w-5 h-5 text-secondary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Disclaimer */}
          <Disclaimer variant="compact" className="mt-8" />
        </div>
      </div>
    </div>
  );
};
