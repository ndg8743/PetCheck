import React from 'react';

export interface AlertProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

const icons = {
  success: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  danger: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

const variantStyles = {
  success: {
    container: `
      bg-secondary-50 border-l-secondary-500
      dark:bg-secondary-900/20
    `,
    icon: 'text-secondary-600 dark:text-secondary-400',
    title: 'text-secondary-800 dark:text-secondary-200',
    content: 'text-secondary-700 dark:text-secondary-300',
  },
  warning: {
    container: `
      bg-warning-50 border-l-warning-500
      dark:bg-warning-900/20
    `,
    icon: 'text-warning-600 dark:text-warning-400',
    title: 'text-warning-800 dark:text-warning-200',
    content: 'text-warning-700 dark:text-warning-300',
  },
  danger: {
    container: `
      bg-accent-50 border-l-accent-500
      dark:bg-accent-900/20
    `,
    icon: 'text-accent-600 dark:text-accent-400',
    title: 'text-accent-800 dark:text-accent-200',
    content: 'text-accent-700 dark:text-accent-300',
  },
  info: {
    container: `
      bg-info-50 border-l-info-500
      dark:bg-info-900/20
    `,
    icon: 'text-info-600 dark:text-info-400',
    title: 'text-info-800 dark:text-info-200',
    content: 'text-info-700 dark:text-info-300',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
  icon,
  style,
}) => {
  // Map 'error' to 'danger' for convenience
  const effectiveVariant = variant === 'error' ? 'danger' : variant;
  const styles = variantStyles[effectiveVariant];

  return (
    <div
      className={`
        rounded-lg border-l-4 p-4
        animate-fade-in
        ${styles.container}
        ${className}
      `}
      role="alert"
      style={style}
    >
      <div className="flex">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icon || icons[effectiveVariant]}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-semibold ${styles.title}`}>{title}</h3>
          )}
          <div className={`text-sm ${title ? 'mt-1' : ''} ${styles.content}`}>
            {children}
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              className={`
                inline-flex rounded-lg p-1.5
                transition-colors duration-200
                hover:bg-black/5 dark:hover:bg-white/5
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                ${styles.icon}
              `}
              onClick={onClose}
              aria-label="Dismiss alert"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Toast notification variant
export interface ToastProps extends Omit<AlertProps, 'className'> {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const Toast: React.FC<ToastProps> = ({
  position = 'top-right',
  ...props
}) => {
  const positionClasses = {
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
  };

  return (
    <div className={`${positionClasses[position]} z-50 max-w-sm w-full animate-slide-in-right`}>
      <Alert {...props} />
    </div>
  );
};
