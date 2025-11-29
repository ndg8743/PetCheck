import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  showLabel?: boolean;
  variant?: 'primary' | 'white' | 'gray';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  label = 'Loading...',
  showLabel = false,
  variant = 'primary',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const variantClasses = {
    primary: 'text-primary-600 dark:text-primary-400',
    white: 'text-white',
    gray: 'text-gray-400 dark:text-gray-500',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <svg
        className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {showLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
};

// Skeleton loader for content placeholders
export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses.text}`}
            style={{
              ...style,
              width: i === lines - 1 ? '60%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Full page loading screen
export interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-navy-900">
      <div className="text-center">
        {/* Custom logo animation */}
        <div className="relative mb-6">
          <div className="w-16 h-16 mx-auto">
            <svg
              viewBox="0 0 64 64"
              className="w-full h-full animate-pulse"
            >
              {/* Paw print shape */}
              <circle cx="32" cy="40" r="12" className="fill-primary-500" />
              <circle cx="20" cy="28" r="6" className="fill-primary-400" />
              <circle cx="44" cy="28" r="6" className="fill-primary-400" />
              <circle cx="14" cy="38" r="5" className="fill-primary-300" />
              <circle cx="50" cy="38" r="5" className="fill-primary-300" />
            </svg>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 border-t-primary-500 rounded-full animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-navy-900 dark:text-white font-display mb-2">
          PetCheck
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
};

// Inline loading indicator
export interface InlineLoaderProps {
  text?: string;
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  text = 'Loading',
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400 ${className}`}>
      <LoadingSpinner size="sm" variant="gray" />
      <span>{text}</span>
    </span>
  );
};
