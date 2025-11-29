import React from 'react';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  icon,
  dot = false,
  pulse = false,
}) => {
  const variantClasses = {
    success: `
      bg-secondary-100 text-secondary-800
      dark:bg-secondary-900/30 dark:text-secondary-300
    `,
    warning: `
      bg-warning-100 text-warning-800
      dark:bg-warning-900/30 dark:text-warning-300
    `,
    danger: `
      bg-accent-100 text-accent-800
      dark:bg-accent-900/30 dark:text-accent-300
    `,
    info: `
      bg-info-100 text-info-800
      dark:bg-info-900/30 dark:text-info-300
    `,
    primary: `
      bg-primary-100 text-primary-800
      dark:bg-primary-900/30 dark:text-primary-300
    `,
    secondary: `
      bg-teal-100 text-teal-800
      dark:bg-teal-900/30 dark:text-teal-300
    `,
    outline: `
      bg-transparent border border-slate-300 text-slate-700
      dark:border-slate-600 dark:text-slate-300
    `,
    default: `
      bg-gray-100 text-gray-800
      dark:bg-gray-700 dark:text-gray-300
    `,
  };

  const dotColors = {
    success: 'bg-secondary-500',
    warning: 'bg-warning-500',
    danger: 'bg-accent-500',
    info: 'bg-info-500',
    primary: 'bg-primary-500',
    secondary: 'bg-teal-500',
    outline: 'bg-slate-500',
    default: 'bg-gray-500',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        transition-colors duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`}
          />
        </span>
      )}
      {icon && <span className={iconSizeClasses[size]}>{icon}</span>}
      {children}
    </span>
  );
};

// Badge group for displaying multiple badges
export interface BadgeGroupProps {
  children: React.ReactNode;
  className?: string;
  max?: number;
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({
  children,
  className = '',
  max,
}) => {
  const childArray = React.Children.toArray(children);
  const visibleChildren = max ? childArray.slice(0, max) : childArray;
  const remainingCount = max ? childArray.length - max : 0;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visibleChildren}
      {remainingCount > 0 && (
        <Badge variant="default" size="sm">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
};
