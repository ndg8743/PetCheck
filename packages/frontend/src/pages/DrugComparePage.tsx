import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Alert } from '../components/ui/Alert';
import { Disclaimer } from '../components/common/Disclaimer';
import { SafetyIndicator } from '../components/features/SafetyIndicator';

interface DrugColumn {
  id: string;
  loading: boolean;
  error?: string;
  // populated once /drugs/:id resolves
  tradeName?: string;
  genericName?: string;
  manufacturer?: string;
  drugClass?: string[];
  routes?: string[];
  approvedSpecies?: string[];
  totalReports?: number;
  seriousReports?: number;
  deathReports?: number;
  // populated once /adverse-events/summary/:drugName resolves
  topReactions?: { term: string; count: number }[];
  reactionsLoading: boolean;
  reactionsError?: string;
}

function safetyScore(col: DrugColumn): number {
  const total = col.totalReports || 0;
  if (total === 0) return 100;
  const serious = col.seriousReports || 0;
  const death = col.deathReports || 0;
  const seriousPct = (serious / total) * 100;
  const deathPct = (death / total) * 100;
  return Math.max(0, Math.round(100 - seriousPct - deathPct * 3));
}

function joinList(values: string[] | undefined): string {
  if (!values || values.length === 0) return `—`;
  return values.join(`, `);
}

export const DrugComparePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const idsParam = searchParams.get(`ids`) || ``;
  const ids = idsParam
    .split(`,`)
    .map((s) => s.trim())
    .filter(Boolean);

  // Validate count up-front. We allow 2 or 3; anything else bounces the
  // user back to /drugs/search with a friendly message.
  const valid = ids.length >= 2 && ids.length <= 3;

  const [columns, setColumns] = useState<DrugColumn[]>(() =>
    ids.map((id) => ({ id, loading: true, reactionsLoading: true }))
  );

  // Fetch each drug + its top-reactions in parallel. allSettled so a
  // single openFDA failure does not blank out the whole grid; each
  // column independently shows loading / error / data states.
  useEffect(() => {
    if (!valid) return;

    let cancelled = false;

    const fetchOne = async (id: string, idx: number) => {
      try {
        const drugRes = await api.get(`/drugs/${encodeURIComponent(id)}`);
        if (cancelled) return;

        const drug = drugRes.data?.data;
        if (!drug) {
          setColumns((prev) => {
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              loading: false,
              error: `Drug not found`,
              reactionsLoading: false,
            };
            return next;
          });
          return;
        }

        setColumns((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            loading: false,
            tradeName: drug.tradeName || drug.genericName,
            genericName: drug.genericName || drug.activeIngredients?.[0]?.name,
            manufacturer: drug.manufacturer,
            drugClass: drug.drugClass,
            routes: drug.routes,
            approvedSpecies: drug.approvedSpecies,
            totalReports: drug.totalReports || 0,
            seriousReports: drug.seriousReports || 0,
            deathReports: drug.deathReports || 0,
          };
          return next;
        });

        // Now fetch the adverse-events summary for the resolved name.
        const drugName = drug.tradeName || drug.genericName || id;
        const generic = drug.genericName || drug.activeIngredients?.[0]?.name;
        const url = `/adverse-events/summary/${encodeURIComponent(drugName)}` +
          (generic && generic !== drugName ? `?genericName=${encodeURIComponent(generic)}` : ``);

        try {
          const aeRes = await api.get(url);
          if (cancelled) return;
          const summary = aeRes.data?.data;
          const top = (summary?.topReactions || [])
            .slice(0, 5)
            .map((r: any) => ({ term: r.reaction || r.term || ``, count: r.count || 0 }));
          setColumns((prev) => {
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              topReactions: top,
              reactionsLoading: false,
              totalReports: next[idx].totalReports || summary?.totalReports || 0,
              seriousReports: next[idx].seriousReports || summary?.seriousReports || 0,
              deathReports: next[idx].deathReports || summary?.deathReports || 0,
            };
            return next;
          });
        } catch (e: any) {
          if (cancelled) return;
          setColumns((prev) => {
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              reactionsLoading: false,
              reactionsError: e?.message || `Failed to load adverse events`,
            };
            return next;
          });
        }
      } catch (e: any) {
        if (cancelled) return;
        setColumns((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            loading: false,
            reactionsLoading: false,
            error: e?.response?.data?.error?.message || e?.message || `Failed to load drug`,
          };
          return next;
        });
      }
    };

    Promise.allSettled(ids.map((id, i) => fetchOne(id, i)));

    return () => {
      cancelled = true;
    };
  }, [idsParam, valid]);

  if (!valid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
        <Container>
          <div className="py-12">
            <Alert variant="warning" className="mb-6">
              Drug compare needs 2 or 3 drugs. Pick from the search results and tap "Compare" again.
            </Alert>
            <Button variant="primary" onClick={() => navigate(`/drugs/search`)}>
              Back to Drug Search
            </Button>
          </div>
        </Container>
      </div>
    );
  }


  const allLoading = columns.every((c) => c.loading);
  const gridTemplateColumns = `repeat(${columns.length}, minmax(0, 1fr))`;

  const renderRow = (
    label: string,
    cells: React.ReactNode[]
  ) => (
    <>
      <div className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-navy-900/40">
        {label}
      </div>
      {cells.map((cell, i) => (
        <div
          key={i}
          className="px-4 py-3 text-sm text-navy-900 dark:text-white border-b border-gray-200 dark:border-gray-700"
        >
          {cell}
        </div>
      ))}
    </>
  );

  const cellFor = (col: DrugColumn, render: (c: DrugColumn) => React.ReactNode): React.ReactNode => {
    if (col.loading) return <span className={`text-gray-400`}>Loading…</span>;
    if (col.error) return <span className={`text-accent-600`}>{col.error}</span>;
    return render(col);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <Container>
        <div className="py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            ← Back
          </Button>


          <div className="mb-6 animate-fade-up flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-1">
                Compare Drugs
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Side-by-side overview of {columns.length} drugs from FDA records.
              </p>
            </div>
            <Badge variant="primary">{columns.length} drugs</Badge>
          </div>


          {allLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" showLabel label="Loading drug details" />
            </div>
          )}


          <Card variant="elevated" className="overflow-hidden">
            <div
              className="grid bg-white dark:bg-navy-800"
              style={{ gridTemplateColumns: `200px ${gridTemplateColumns}` }}
            >
              <div className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-navy-900/40 border-b border-gray-200 dark:border-gray-700">
                Drug
              </div>
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3"
                >
                  <SafetyIndicator score={safetyScore(col)} variant="circular" size="sm" />
                  <div className="min-w-0">
                    <div className="font-semibold text-navy-900 dark:text-white truncate">
                      {col.loading ? `Loading…` : col.tradeName || col.id}
                    </div>
                    {col.genericName && col.genericName !== col.tradeName && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {col.genericName}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {renderRow(
                `Trade name`,
                columns.map((col) => cellFor(col, (c) => c.tradeName || `—`))
              )}
              {renderRow(
                `Generic`,
                columns.map((col) => cellFor(col, (c) => c.genericName || `—`))
              )}
              {renderRow(
                `Manufacturer`,
                columns.map((col) => cellFor(col, (c) => c.manufacturer || `—`))
              )}
              {renderRow(
                `Drug class`,
                columns.map((col) => cellFor(col, (c) => joinList(c.drugClass)))
              )}
              {renderRow(
                `Routes`,
                columns.map((col) => cellFor(col, (c) => joinList(c.routes)))
              )}
              {renderRow(
                `Approved species`,
                columns.map((col) => cellFor(col, (c) => joinList(c.approvedSpecies)))
              )}
              {renderRow(
                `Total reports`,
                columns.map((col) => cellFor(col, (c) => (c.totalReports || 0).toLocaleString()))
              )}
              {renderRow(
                `Top-5 adverse events`,
                columns.map((col) => {
                  if (col.loading || col.reactionsLoading) {
                    return <span className={`text-gray-400`}>Loading…</span>;
                  }
                  if (col.reactionsError) {
                    return <span className={`text-accent-600`}>{col.reactionsError}</span>;
                  }
                  const top = col.topReactions || [];
                  if (top.length === 0) {
                    return <span className={`text-gray-400`}>No reactions reported</span>;
                  }
                  return (
                    <ol className={`list-decimal pl-5 space-y-1`}>
                      {top.map((r, i) => (
                        <li key={i} className={`text-sm`}>
                          <span className={`font-medium`}>{r.term}</span>
                          <span className={`text-gray-500 dark:text-gray-400 ml-1`}>
                            ({r.count.toLocaleString()})
                          </span>
                        </li>
                      ))}
                    </ol>
                  );
                })
              )}
            </div>
          </Card>

          <div className="mt-8">
            <Disclaimer variant="full" />
          </div>
        </div>
      </Container>
    </div>
  );
};
