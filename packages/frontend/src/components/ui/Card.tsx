import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'glass' | 'accent' | 'danger' | 'warning' | 'success';
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const variantClasses = {
  default: `
    bg-white dark:bg-navy-800
    border border-gray-200 dark:border-gray-700
    shadow-card
  `,
  elevated: `
    bg-white dark:bg-navy-800
    border border-gray-200 dark:border-gray-700
    shadow-elevated
  `,
  glass: `
    backdrop-blur-xl bg-white/80 dark:bg-navy-800/80
    border border-white/20 dark:border-gray-700/50
    shadow-glass
  `,
  accent: `
    bg-white dark:bg-navy-800
    border border-gray-200 dark:border-gray-700
    border-l-4 border-l-primary-500
    shadow-card
  `,
  danger: `
    bg-white dark:bg-navy-800
    border border-gray-200 dark:border-gray-700
    border-l-4 border-l-accent-500
    shadow-card
  `,
  warning: `
    bg-white dark:bg-navy-800
    border border-gray-200 dark:border-gray-700
    border-l-4 border-l-warning-500
    shadow-card
  `,
  success: `
    bg-white dark:bg-navy-800
    border border-gray-200 dark:border-gray-700
    border-l-4 border-l-secondary-500
    shadow-card
  `,
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  hover = false,
  onClick,
  style,
}) => {
  const hoverClasses = hover
    ? 'transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer'
    : 'transition-all duration-300';

  return (
    <div
      className={`
        rounded-xl overflow-hidden
        ${variantClasses[variant]}
        ${hoverClasses}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={style}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  action,
}) => {
  return (
    <div
      className={`
        px-6 py-4
        border-b border-gray-200 dark:border-gray-700
        flex items-center justify-between
        ${className}
      `}
    >
      <div className="flex-1">{children}</div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
}) => {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
};

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`
        px-6 py-4
        border-t border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-navy-900/50
        ${className}
      `}
    >
      {children}
    </div>
  );
};
