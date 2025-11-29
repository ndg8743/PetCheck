import React from 'react';

export type SafetyStatus = 'good' | 'attention' | 'action-required';

export interface SafetyIndicatorProps {
  status: SafetyStatus;
  label?: string;
  description?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'badge' | 'card' | 'circular';
  className?: string;
  animate?: boolean;
}

export const SafetyIndicator: React.FC<SafetyIndicatorProps> = ({
  status,
  label,
  description,
  showIcon = true,
  size = 'md',
  variant = 'badge',
  className = '',
  animate = true,
}) => {
  const statusConfig = {
    good: {
      gradient: 'from-secondary-500 to-secondary-600',
      bgColor: 'bg-secondary-50 dark:bg-secondary-900/20',
      borderColor: 'border-secondary-200 dark:border-secondary-800',
      textColor: 'text-secondary-700 dark:text-secondary-300',
      iconBg: 'bg-secondary-100 dark:bg-secondary-900/30',
      ringColor: 'ring-secondary-500/30',
      label: label || 'Good',
      icon: (
        <svg className="h-full w-full" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    attention: {
      gradient: 'from-warning-500 to-warning-600',
      bgColor: 'bg-warning-50 dark:bg-warning-900/20',
      borderColor: 'border-warning-200 dark:border-warning-800',
      textColor: 'text-warning-700 dark:text-warning-300',
      iconBg: 'bg-warning-100 dark:bg-warning-900/30',
      ringColor: 'ring-warning-500/30',
      label: label || 'Attention Needed',
      icon: (
        <svg className="h-full w-full" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    'action-required': {
      gradient: 'from-accent-500 to-accent-600',
      bgColor: 'bg-accent-50 dark:bg-accent-900/20',
      borderColor: 'border-accent-200 dark:border-accent-800',
      textColor: 'text-accent-700 dark:text-accent-300',
      iconBg: 'bg-accent-100 dark:bg-accent-900/30',
      ringColor: 'ring-accent-500/30',
      label: label || 'Action Required',
      icon: (
        <svg className="h-full w-full" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  };

  const sizeConfig = {
    sm: {
      icon: 'h-4 w-4',
      circularIcon: 'h-6 w-6',
      circularSize: 'h-12 w-12',
      text: 'text-sm',
      descText: 'text-xs',
      padding: 'px-2.5 py-1.5',
      cardPadding: 'p-3',
    },
    md: {
      icon: 'h-5 w-5',
      circularIcon: 'h-8 w-8',
      circularSize: 'h-16 w-16',
      text: 'text-base',
      descText: 'text-sm',
      padding: 'px-3 py-2',
      cardPadding: 'p-4',
    },
    lg: {
      icon: 'h-6 w-6',
      circularIcon: 'h-10 w-10',
      circularSize: 'h-20 w-20',
      text: 'text-lg',
      descText: 'text-base',
      padding: 'px-4 py-2.5',
      cardPadding: 'p-5',
    },
    xl: {
      icon: 'h-8 w-8',
      circularIcon: 'h-12 w-12',
      circularSize: 'h-24 w-24',
      text: 'text-xl',
      descText: 'text-lg',
      padding: 'px-5 py-3',
      cardPadding: 'p-6',
    },
  };

  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  // Circular variant - large circular indicator with gradient
  if (variant === 'circular') {
    return (
      <div
        className={`flex flex-col items-center ${className}`}
        role="status"
        aria-label={`Safety status: ${config.label}`}
      >
        <div className="relative">
          {/* Animated ring */}
          {animate && status === 'action-required' && (
            <div
              className={`absolute inset-0 ${sizes.circularSize} rounded-full bg-gradient-to-r ${config.gradient} animate-pulse-ring`}
            />
          )}

          {/* Main circle */}
          <div
            className={`
              relative ${sizes.circularSize} rounded-full
              bg-gradient-to-br ${config.gradient}
              flex items-center justify-center
              shadow-lg
              ${animate ? 'animate-scale-in' : ''}
            `}
          >
            <div className={`${sizes.circularIcon} text-white`}>{config.icon}</div>
          </div>
        </div>

        <div className="mt-3 text-center">
          <span className={`font-semibold ${config.textColor} ${sizes.text} font-display`}>
            {config.label}
          </span>
          {description && (
            <p className={`mt-1 text-gray-600 dark:text-gray-400 ${sizes.descText} max-w-xs`}>
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Card variant - full card with icon and description
  if (variant === 'card') {
    return (
      <div
        className={`
          ${sizes.cardPadding} rounded-xl
          ${config.bgColor}
          border ${config.borderColor}
          ${animate ? 'animate-fade-in' : ''}
          ${className}
        `}
        role="status"
        aria-label={`Safety status: ${config.label}`}
      >
        <div className="flex items-start gap-3">
          {showIcon && (
            <div className={`flex-shrink-0 p-2 rounded-lg ${config.iconBg}`}>
              <div className={`${sizes.icon} ${config.textColor}`}>{config.icon}</div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className={`font-semibold ${config.textColor} ${sizes.text} font-display block`}>
              {config.label}
            </span>
            {description && (
              <p className={`mt-1 text-gray-600 dark:text-gray-400 ${sizes.descText}`}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default badge variant
  return (
    <div
      className={`
        inline-flex items-center gap-2 ${sizes.padding} rounded-lg
        ${config.bgColor}
        border ${config.borderColor}
        ${animate ? 'animate-fade-in' : ''}
        ${className}
      `}
      role="status"
      aria-label={`Safety status: ${config.label}`}
    >
      {showIcon && (
        <div className={`flex-shrink-0 ${sizes.icon} ${config.textColor}`}>{config.icon}</div>
      )}
      <div>
        <span className={`font-semibold ${config.textColor} ${sizes.text}`}>{config.label}</span>
        {description && (
          <p className={`text-gray-600 dark:text-gray-400 ${sizes.descText} mt-0.5`}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

// Quick status indicator - smaller inline version
export interface QuickStatusProps {
  status: SafetyStatus;
  className?: string;
}

export const QuickStatus: React.FC<QuickStatusProps> = ({ status, className = '' }) => {
  const colors = {
    good: 'bg-secondary-500',
    attention: 'bg-warning-500',
    'action-required': 'bg-accent-500',
  };

  const labels = {
    good: 'Safe',
    attention: 'Caution',
    'action-required': 'Alert',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{labels[status]}</span>
    </div>
  );
};
