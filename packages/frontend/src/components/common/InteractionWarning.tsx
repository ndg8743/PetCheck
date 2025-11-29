import React from 'react';
import { Badge } from '../ui/Badge';

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  recommendation?: string;
}

export interface InteractionWarningProps {
  interactions: DrugInteraction[];
  onDismiss?: () => void;
  className?: string;
  variant?: 'card' | 'compact' | 'inline';
}

export const InteractionWarning: React.FC<InteractionWarningProps> = ({
  interactions,
  onDismiss,
  className = '',
  variant = 'card',
}) => {
  if (interactions.length === 0) {
    return null;
  }

  const getSeverityConfig = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'severe':
        return {
          variant: 'danger' as const,
          bgColor: 'bg-accent-50 dark:bg-accent-900/20',
          borderColor: 'border-accent-200 dark:border-accent-800',
          textColor: 'text-accent-700 dark:text-accent-300',
          iconColor: 'text-accent-500',
          gradient: 'from-accent-500 to-accent-600',
          label: 'Severe',
        };
      case 'moderate':
        return {
          variant: 'warning' as const,
          bgColor: 'bg-warning-50 dark:bg-warning-900/20',
          borderColor: 'border-warning-200 dark:border-warning-800',
          textColor: 'text-warning-700 dark:text-warning-300',
          iconColor: 'text-warning-500',
          gradient: 'from-warning-500 to-warning-600',
          label: 'Moderate',
        };
      case 'mild':
        return {
          variant: 'info' as const,
          bgColor: 'bg-primary-50 dark:bg-primary-900/20',
          borderColor: 'border-primary-200 dark:border-primary-800',
          textColor: 'text-primary-700 dark:text-primary-300',
          iconColor: 'text-primary-500',
          gradient: 'from-primary-500 to-primary-600',
          label: 'Mild',
        };
    }
  };

  const severeInteractions = interactions.filter((i) => i.severity === 'severe');
  const hasSevere = severeInteractions.length > 0;
  const headerConfig = hasSevere
    ? getSeverityConfig('severe')
    : getSeverityConfig('moderate');

  // Inline variant
  if (variant === 'inline') {
    const firstInteraction = interactions[0];
    const config = getSeverityConfig(firstInteraction.severity);
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant={config.variant} size="sm">
          {interactions.length} {interactions.length === 1 ? 'Interaction' : 'Interactions'}
        </Badge>
        <span className={`text-sm ${config.textColor}`}>
          {firstInteraction.drug1} + {firstInteraction.drug2}
        </span>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        className={`
          rounded-xl overflow-hidden
          ${headerConfig.bgColor}
          border ${headerConfig.borderColor}
          ${className}
        `}
        role="alert"
      >
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg
              className={`w-5 h-5 ${headerConfig.iconColor}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className={`font-semibold text-sm ${headerConfig.textColor}`}>
              {interactions.length} Potential{' '}
              {interactions.length === 1 ? 'Interaction' : 'Interactions'}
            </span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`p-1 rounded hover:bg-white/50 dark:hover:bg-black/20 transition-colors`}
              aria-label="Dismiss"
            >
              <svg className={`w-4 h-4 ${headerConfig.textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <div
      className={`
        rounded-2xl overflow-hidden
        bg-white dark:bg-navy-800
        border border-gray-200 dark:border-gray-700
        shadow-card
        animate-fade-in
        ${className}
      `}
      role="alert"
    >
      {/* Header */}
      <div className={`px-5 py-4 ${headerConfig.bgColor} border-b ${headerConfig.borderColor}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20`}>
              <svg
                className={`w-5 h-5 ${headerConfig.iconColor}`}
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
              <h3 className={`font-semibold ${headerConfig.textColor} font-display`}>
                {interactions.length} Potential Drug{' '}
                {interactions.length === 1 ? 'Interaction' : 'Interactions'} Found
              </h3>
              {hasSevere && (
                <p className="text-sm text-accent-600 dark:text-accent-400">
                  {severeInteractions.length} severe interaction{severeInteractions.length > 1 ? 's' : ''} detected
                </p>
              )}
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`p-2 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 transition-colors ${headerConfig.textColor}`}
              aria-label="Dismiss alert"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Interactions list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {interactions.map((interaction, index) => {
          const config = getSeverityConfig(interaction.severity);
          return (
            <div key={index} className="p-5">
              {/* Drug pair */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-navy-900 dark:text-white">
                    {interaction.drug1}
                  </span>
                  <div className="flex items-center">
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-navy-900 dark:text-white">
                    {interaction.drug2}
                  </span>
                </div>
                <Badge variant={config.variant} size="sm">
                  {config.label}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {interaction.description}
              </p>

              {/* Recommendation */}
              {interaction.recommendation && (
                <div className={`rounded-lg p-3 ${config.bgColor} border ${config.borderColor}`}>
                  <div className="flex items-start gap-2">
                    <svg
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className={`text-xs font-semibold ${config.textColor} uppercase tracking-wider mb-1`}>
                        Recommendation
                      </p>
                      <p className={`text-sm ${config.textColor}`}>
                        {interaction.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer disclaimer */}
      <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Important:</strong> Always consult with your veterinarian before combining
            medications or making changes to your pet's treatment plan.
          </p>
        </div>
      </div>
    </div>
  );
};

// Summary component for displaying interaction count
export interface InteractionSummaryProps {
  mildCount: number;
  moderateCount: number;
  severeCount: number;
  onClick?: () => void;
  className?: string;
}

export const InteractionSummary: React.FC<InteractionSummaryProps> = ({
  mildCount,
  moderateCount,
  severeCount,
  onClick,
  className = '',
}) => {
  const total = mildCount + moderateCount + severeCount;
  if (total === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        bg-white dark:bg-navy-800
        border border-gray-200 dark:border-gray-700
        hover:border-primary-300 dark:hover:border-primary-600
        hover:shadow-card-hover
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-500
        ${className}
      `}
    >
      <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
        <svg
          className="w-5 h-5 text-warning-600 dark:text-warning-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-navy-900 dark:text-white">
          {total} {total === 1 ? 'Interaction' : 'Interactions'} Found
        </p>
        <div className="flex items-center gap-2 mt-1">
          {severeCount > 0 && (
            <span className="text-xs text-accent-600 dark:text-accent-400">{severeCount} severe</span>
          )}
          {moderateCount > 0 && (
            <span className="text-xs text-warning-600 dark:text-warning-400">{moderateCount} moderate</span>
          )}
          {mildCount > 0 && (
            <span className="text-xs text-primary-600 dark:text-primary-400">{mildCount} mild</span>
          )}
        </div>
      </div>
      <svg
        className="w-5 h-5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};
