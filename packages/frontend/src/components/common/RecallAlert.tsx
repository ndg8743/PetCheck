import React from 'react';
import { Badge } from '../ui/Badge';

export interface RecallData {
  id: string;
  productName: string;
  recallDate: string;
  reason: string;
  status: 'ongoing' | 'completed' | 'terminated';
  classification?: 'Class I' | 'Class II' | 'Class III';
}

export interface RecallAlertProps {
  recalls: RecallData[];
  onViewDetails?: (recallId: string) => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
}

export const RecallAlert: React.FC<RecallAlertProps> = ({
  recalls,
  onViewDetails,
  onDismiss,
  className = '',
  variant = 'card',
}) => {
  if (recalls.length === 0) {
    return null;
  }

  const activeRecalls = recalls.filter((r) => r.status === 'ongoing');

  const getClassificationConfig = (classification?: string) => {
    switch (classification) {
      case 'Class I':
        return {
          variant: 'danger' as const,
          color: 'accent',
          description: 'Serious health hazard',
        };
      case 'Class II':
        return {
          variant: 'warning' as const,
          color: 'warning',
          description: 'May cause health problems',
        };
      case 'Class III':
        return {
          variant: 'info' as const,
          color: 'primary',
          description: 'Not likely to cause health problems',
        };
      default:
        return {
          variant: 'warning' as const,
          color: 'warning',
          description: '',
        };
    }
  };

  // Banner variant - simplified horizontal banner
  if (variant === 'banner') {
    return (
      <div
        className={`
          relative overflow-hidden rounded-xl
          bg-accent-50 dark:bg-accent-900/20
          border border-accent-200 dark:border-accent-800
          ${className}
        `}
        role="alert"
      >
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-accent-500 to-accent-600" />
        <div className="flex items-center justify-between gap-4 px-5 py-4 pl-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/30">
              <svg
                className="w-5 h-5 text-accent-600 dark:text-accent-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-accent-800 dark:text-accent-200 font-display">
                {activeRecalls.length} Active{' '}
                {activeRecalls.length === 1 ? 'Recall' : 'Recalls'}
              </p>
              <p className="text-sm text-accent-700 dark:text-accent-300">
                Review affected products for your pet's safety
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(activeRecalls[0]?.id)}
                className="
                  px-4 py-2 rounded-lg
                  bg-accent-600 hover:bg-accent-700
                  text-white text-sm font-medium
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2
                "
              >
                View Details
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-2 rounded-lg hover:bg-accent-100 dark:hover:bg-accent-900/30 transition-colors"
                aria-label="Dismiss"
              >
                <svg
                  className="w-5 h-5 text-accent-600 dark:text-accent-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline variant - minimal inline display
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`} role="alert">
        <Badge variant="danger" dot pulse>
          {activeRecalls.length} {activeRecalls.length === 1 ? 'Recall' : 'Recalls'}
        </Badge>
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(activeRecalls[0]?.id)}
            className="text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline"
          >
            View
          </button>
        )}
      </div>
    );
  }

  // Card variant - detailed card display
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-white dark:bg-navy-800
        border border-accent-200 dark:border-accent-800
        shadow-card
        animate-fade-in
        ${className}
      `}
      role="alert"
    >
      {/* Bold left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-accent-500 to-accent-600" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 pl-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-100 dark:bg-accent-900/30">
            <svg
              className="w-6 h-6 text-accent-600 dark:text-accent-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-navy-900 dark:text-white font-display">
              {activeRecalls.length} Active{' '}
              {activeRecalls.length === 1 ? 'Recall' : 'Recalls'} Found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Immediate attention recommended
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="
              p-2 rounded-lg
              text-gray-400 hover:text-gray-600
              dark:text-gray-500 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
            "
            aria-label="Dismiss alert"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Recall list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {activeRecalls.slice(0, 3).map((recall) => {
          const classConfig = getClassificationConfig(recall.classification);
          return (
            <div
              key={recall.id}
              className="px-5 py-4 pl-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-semibold text-navy-900 dark:text-white font-display truncate">
                      {recall.productName}
                    </h4>
                    {recall.classification && (
                      <Badge variant={classConfig.variant} size="sm">
                        {recall.classification}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                    {recall.reason}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {new Date(recall.recallDate).toLocaleDateString()}
                    </span>
                    {classConfig.description && (
                      <span className={`text-${classConfig.color}-600 dark:text-${classConfig.color}-400`}>
                        {classConfig.description}
                      </span>
                    )}
                  </div>
                </div>
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(recall.id)}
                    className="
                      flex-shrink-0 px-3 py-1.5 rounded-lg
                      text-sm font-medium
                      text-accent-600 dark:text-accent-400
                      hover:bg-accent-50 dark:hover:bg-accent-900/20
                      transition-colors
                      focus:outline-none focus:ring-2 focus:ring-accent-500
                    "
                  >
                    Details
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more */}
      {activeRecalls.length > 3 && (
        <div className="px-5 py-3 pl-6 bg-gray-50 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onViewDetails?.(activeRecalls[0]?.id)}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            View all {activeRecalls.length} recalls
          </button>
        </div>
      )}
    </div>
  );
};

// Compact recall badge for use in cards
export interface RecallBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

export const RecallBadge: React.FC<RecallBadgeProps> = ({ count, onClick, className = '' }) => {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        bg-accent-100 dark:bg-accent-900/30
        text-accent-700 dark:text-accent-300
        text-sm font-medium
        hover:bg-accent-200 dark:hover:bg-accent-900/50
        transition-colors
        focus:outline-none focus:ring-2 focus:ring-accent-500
        ${className}
      `}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
      </span>
      {count} {count === 1 ? 'Recall' : 'Recalls'}
    </button>
  );
};
