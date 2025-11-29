import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = `
    relative inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.98]
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-primary-600 to-primary-500 text-white
      hover:from-primary-700 hover:to-primary-600
      focus:ring-primary-500
      shadow-md hover:shadow-lg hover:shadow-primary-500/25
      dark:from-primary-500 dark:to-primary-400
      dark:hover:from-primary-600 dark:hover:to-primary-500
    `,
    secondary: `
      bg-secondary-600 text-white
      hover:bg-secondary-700
      focus:ring-secondary-500
      shadow-md hover:shadow-lg
      dark:bg-secondary-500 dark:hover:bg-secondary-600
    `,
    danger: `
      bg-accent-600 text-white
      hover:bg-accent-700
      focus:ring-accent-500
      shadow-md hover:shadow-lg hover:shadow-accent-500/25
      dark:bg-accent-500 dark:hover:bg-accent-600
    `,
    outline: `
      bg-transparent border-2 border-gray-300 text-gray-700
      hover:bg-gray-50 hover:border-gray-400
      focus:ring-gray-500
      dark:border-gray-600 dark:text-gray-300
      dark:hover:bg-gray-800 dark:hover:border-gray-500
    `,
    ghost: `
      bg-transparent text-gray-700
      hover:bg-gray-100
      focus:ring-gray-500
      dark:text-gray-300 dark:hover:bg-gray-800
    `,
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className={`animate-spin ${iconSizeClasses[size]}`}
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
      ) : (
        leftIcon && <span className={iconSizeClasses[size]}>{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && (
        <span className={iconSizeClasses[size]}>{rightIcon}</span>
      )}
    </button>
  );
};
