import React from 'react';

export interface DisclaimerProps {
  variant?: 'compact' | 'full' | 'banner' | 'inline';
  className?: string;
  onDismiss?: () => void;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({
  variant = 'full',
  className = '',
  onDismiss,
}) => {
  // Inline variant - simple text
  if (variant === 'inline') {
    return (
      <p className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
        <strong>Disclaimer:</strong> For informational purposes only. Consult a veterinarian for
        medical advice.
      </p>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        className={`
          flex items-start gap-2 px-3 py-2 rounded-lg
          bg-warning-50 dark:bg-warning-900/10
          border border-warning-200 dark:border-warning-800/50
          ${className}
        `}
      >
        <svg
          className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm text-warning-800 dark:text-warning-200">
          <strong>Disclaimer:</strong> This information is for educational purposes only. Always
          consult a licensed veterinarian for medical advice.
        </p>
      </div>
    );
  }

  // Banner variant - horizontal dismissible
  if (variant === 'banner') {
    return (
      <div
        className={`
          relative overflow-hidden rounded-xl
          bg-gradient-to-r from-warning-50 to-warning-100
          dark:from-warning-900/20 dark:to-warning-900/10
          border border-warning-200 dark:border-warning-800
          ${className}
        `}
        role="alert"
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-warning-400 to-warning-500" />
        <div className="flex items-center justify-between gap-4 px-5 py-4 pl-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
              <svg
                className="w-5 h-5 text-warning-600 dark:text-warning-400"
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
            <div>
              <p className="font-semibold text-warning-800 dark:text-warning-200 text-sm">
                Medical Disclaimer
              </p>
              <p className="text-sm text-warning-700 dark:text-warning-300">
                This information is not intended as a substitute for professional veterinary advice.
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg hover:bg-warning-100 dark:hover:bg-warning-900/30 transition-colors"
              aria-label="Dismiss"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full variant - detailed card
  return (
    <div
      className={`
        rounded-2xl overflow-hidden
        bg-white dark:bg-navy-800
        border border-warning-200 dark:border-warning-800
        shadow-card
        ${className}
      `}
      role="alert"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-900/10 border-b border-warning-200 dark:border-warning-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-warning-100 dark:bg-warning-900/30">
            <svg
              className="w-6 h-6 text-warning-600 dark:text-warning-400"
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
          <div>
            <h3 className="font-semibold text-warning-900 dark:text-warning-100 font-display">
              Medical Disclaimer
            </h3>
            <p className="text-sm text-warning-700 dark:text-warning-300">
              Please read before proceeding
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          The information provided by PetCheck is for informational and educational purposes only.
          It is not intended to be a substitute for professional veterinary advice, diagnosis, or
          treatment.
        </p>

        <div>
          <h4 className="text-sm font-semibold text-navy-900 dark:text-white mb-2 font-display">
            Important Guidelines
          </h4>
          <ul className="space-y-2">
            {[
              'Always seek the advice of your veterinarian or other qualified animal health provider with any questions you may have regarding your pet\'s medical condition.',
              'Never disregard professional veterinary advice or delay in seeking it because of something you have read on PetCheck.',
              'If you think your pet may have a medical emergency, call your veterinarian or emergency veterinary clinic immediately.',
              'The data presented is sourced from the FDA OpenFDA API and may not be complete or up-to-date. Always verify information with your veterinarian.',
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <svg
                  className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          PetCheck and its operators are not responsible for any decisions made based on
          information provided through this platform. Use of this service is at your own risk.
        </p>
      </div>
    </div>
  );
};

// Trust indicator component
export interface TrustIndicatorProps {
  className?: string;
}

export const TrustIndicator: React.FC<TrustIndicatorProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
        <svg
          className="w-4 h-4 text-primary-600 dark:text-primary-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
          FDA Data Source
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 dark:border-secondary-800">
        <svg
          className="w-4 h-4 text-secondary-600 dark:text-secondary-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">
          Secure & Private
        </span>
      </div>
    </div>
  );
};
