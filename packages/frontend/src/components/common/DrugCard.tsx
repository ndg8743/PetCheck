import React from 'react';
import { Badge, BadgeGroup } from '../ui/Badge';

export interface DrugCardProps {
  drugName: string;
  drugClass?: string;
  species: string[];
  warnings?: string[];
  adverseEventCount?: number;
  recallCount?: number;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'compact' | 'featured';
}

export const DrugCard: React.FC<DrugCardProps> = ({
  drugName,
  drugClass,
  species,
  warnings = [],
  adverseEventCount,
  recallCount,
  onClick,
  className = '',
  variant = 'default',
}) => {
  const hasWarnings = warnings.length > 0 || (recallCount && recallCount > 0);
  const hasSevereWarnings = (recallCount && recallCount > 0) || warnings.length > 2;

  const getAccentColor = () => {
    if (hasSevereWarnings) return 'from-accent-500 to-accent-600';
    if (hasWarnings) return 'from-warning-500 to-warning-600';
    return 'from-secondary-500 to-secondary-600';
  };

  const getStatusIcon = () => {
    if (hasSevereWarnings) {
      return (
        <div className="p-2 rounded-full bg-accent-100 dark:bg-accent-900/30">
          <svg
            className="h-5 w-5 text-accent-600 dark:text-accent-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-label="Warning"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }
    if (hasWarnings) {
      return (
        <div className="p-2 rounded-full bg-warning-100 dark:bg-warning-900/30">
          <svg
            className="h-5 w-5 text-warning-600 dark:text-warning-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }
    return (
      <div className="p-2 rounded-full bg-secondary-100 dark:bg-secondary-900/30">
        <svg
          className="h-5 w-5 text-secondary-600 dark:text-secondary-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className={`
          w-full text-left p-4 rounded-xl
          bg-white dark:bg-navy-800
          border border-gray-200 dark:border-gray-700
          hover:border-primary-300 dark:hover:border-primary-600
          hover:shadow-card-hover
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          dark:focus:ring-offset-navy-900
          ${className}
        `}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-navy-900 dark:text-white truncate font-display">
              {drugName}
            </h3>
            {drugClass && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {drugClass}
              </p>
            )}
          </div>
          <svg
            className="h-5 w-5 text-gray-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white dark:bg-navy-800
        border border-gray-200 dark:border-gray-700
        ${onClick ? 'cursor-pointer hover:shadow-card-hover hover:border-primary-300 dark:hover:border-primary-600' : ''}
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        dark:focus:ring-offset-navy-900
        group
        ${variant === 'featured' ? 'shadow-elevated' : 'shadow-card'}
        ${className}
      `}
    >
      {/* Colored top accent */}
      <div className={`h-1.5 bg-gradient-to-r ${getAccentColor()}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-navy-900 dark:text-white font-display group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {drugName}
            </h3>
            {drugClass && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {drugClass}
              </p>
            )}
          </div>
          {getStatusIcon()}
        </div>

        {/* Species badges */}
        <div className="mb-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Approved for
          </span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <BadgeGroup
              badges={species.map((sp) => ({
                label: sp,
                variant: 'primary' as const,
              }))}
              maxVisible={4}
            />
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Active Warnings
            </span>
            <ul className="mt-2 space-y-1.5">
              {warnings.slice(0, 2).map((warning, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-accent-700 dark:text-accent-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-1.5 flex-shrink-0" />
                  <span className="line-clamp-2">{warning}</span>
                </li>
              ))}
            </ul>
            {warnings.length > 2 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 ml-3.5">
                +{warnings.length - 2} more warnings
              </p>
            )}
          </div>
        )}

        {/* Stats footer */}
        {(adverseEventCount !== undefined || recallCount !== undefined) && (
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {adverseEventCount !== undefined && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                  <svg
                    className="w-4 h-4 text-gray-500 dark:text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Events</p>
                  <p className="text-sm font-semibold text-navy-900 dark:text-white">
                    {adverseEventCount.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {recallCount !== undefined && recallCount > 0 && (
              <div className="ml-auto">
                <Badge variant="danger" size="sm" dot pulse>
                  {recallCount} {recallCount === 1 ? 'Recall' : 'Recalls'}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover arrow indicator */}
      {onClick && (
        <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-5 h-5 text-primary-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      )}
    </div>
  );
};
