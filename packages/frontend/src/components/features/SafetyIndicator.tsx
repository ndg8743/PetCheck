import React from 'react';

export interface SafetyIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circular' | 'badge' | 'bar';
  showLabel?: boolean;
  className?: string;
}

export const SafetyIndicator: React.FC<SafetyIndicatorProps> = ({
  score,
  size = 'md',
  variant = 'circular',
  showLabel = false,
  className = '',
}) => {
  const getColor = (score: number) => {
    if (score >= 80) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', label: 'Safe' };
    if (score >= 60) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', label: 'Caution' };
    if (score >= 40) return { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', label: 'Warning' };
    return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', label: 'Risk' };
  };

  const colors = getColor(score);

  const sizeClasses = {
    sm: {
      container: 'w-12 h-12',
      text: 'text-sm font-bold',
      label: 'text-xs',
    },
    md: {
      container: 'w-16 h-16',
      text: 'text-xl font-bold',
      label: 'text-xs',
    },
    lg: {
      container: 'w-20 h-20',
      text: 'text-2xl font-bold',
      label: 'text-sm',
    },
  };

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
        <span className={`font-semibold ${colors.text}`}>{score}</span>
        {showLabel && (
          <span className="text-slate-500 dark:text-slate-400 text-sm">{colors.label}</span>
        )}
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex justify-between items-center mb-1">
          <span className={`${sizeClasses[size].label} font-medium ${colors.text}`}>
            {showLabel ? colors.label : 'Safety Score'}
          </span>
          <span className={`${sizeClasses[size].label} font-bold ${colors.text}`}>{score}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-navy-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${colors.bg}`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      </div>
    );
  }

  // Circular variant (default)
  const radius = size === 'sm' ? 18 : size === 'md' ? 26 : 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeClasses[size].container}`}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
          {/* Background circle */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-200 dark:text-navy-700"
          />
          {/* Progress circle */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            className={colors.text}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${sizeClasses[size].text} ${colors.text}`}>{score}</span>
        </div>
      </div>
      {showLabel && (
        <span className={`mt-1 ${sizeClasses[size].label} font-medium ${colors.text}`}>
          {colors.label}
        </span>
      )}
    </div>
  );
};

export default SafetyIndicator;
