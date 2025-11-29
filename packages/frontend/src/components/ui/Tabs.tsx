import React, { useState, useRef, useEffect } from 'react';

export interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  variant?: 'underline' | 'pills' | 'boxed';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  className = '',
  variant = 'underline',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  // Animated underline indicator
  useEffect(() => {
    if (variant === 'underline') {
      const activeTabElement = tabRefs.current.get(activeTab);
      if (activeTabElement) {
        setIndicatorStyle({
          width: activeTabElement.offsetWidth,
          transform: `translateX(${activeTabElement.offsetLeft}px)`,
        });
      }
    }
  }, [activeTab, variant]);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  const baseTabClasses = `
    relative inline-flex items-center gap-2
    font-medium text-sm
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = {
    underline: {
      container: 'border-b border-gray-200 dark:border-gray-700',
      nav: 'relative -mb-px flex space-x-8',
      tab: (isActive: boolean) => `
        ${baseTabClasses}
        whitespace-nowrap py-4 px-1
        ${
          isActive
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        }
      `,
      indicator: `
        absolute bottom-0 left-0 h-0.5
        bg-primary-600 dark:bg-primary-400
        transition-all duration-300 ease-out-expo
      `,
    },
    pills: {
      container: '',
      nav: 'flex space-x-2 p-1 bg-gray-100 dark:bg-navy-800 rounded-lg',
      tab: (isActive: boolean) => `
        ${baseTabClasses}
        whitespace-nowrap py-2 px-4 rounded-md
        ${
          isActive
            ? 'bg-white dark:bg-navy-700 text-navy-900 dark:text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
        }
      `,
      indicator: '',
    },
    boxed: {
      container: 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
      nav: 'flex bg-gray-50 dark:bg-navy-800 border-b border-gray-200 dark:border-gray-700',
      tab: (isActive: boolean) => `
        ${baseTabClasses}
        flex-1 whitespace-nowrap py-3 px-4 text-center
        border-r border-gray-200 dark:border-gray-700 last:border-r-0
        ${
          isActive
            ? 'bg-white dark:bg-navy-700 text-primary-600 dark:text-primary-400'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-navy-700'
        }
      `,
      indicator: '',
    },
  };

  const styles = variantClasses[variant];

  return (
    <div className={className}>
      <div className={styles.container}>
        <nav className={styles.nav} aria-label="Tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
              }}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
              disabled={tab.disabled}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              className={styles.tab(activeTab === tab.id)}
            >
              {tab.icon && <span className="w-5 h-5">{tab.icon}</span>}
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={`
                    inline-flex items-center justify-center
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }
                  `}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
          {variant === 'underline' && (
            <span className={styles.indicator} style={indicatorStyle} />
          )}
        </nav>
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={activeTab}
        className={`mt-4 animate-fade-in ${variant === 'boxed' ? 'p-4' : ''}`}
      >
        {activeTabContent}
      </div>
    </div>
  );
};

// Simple tab buttons without content management (controlled)
export interface TabButtonsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const TabButtons: React.FC<TabButtonsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-sm',
  };

  return (
    <div className={`flex space-x-1 p-1 bg-gray-100 dark:bg-navy-800 rounded-lg ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          className={`
            inline-flex items-center gap-2 font-medium rounded-md
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${sizeClasses[size]}
            ${
              activeTab === tab.id
                ? 'bg-white dark:bg-navy-700 text-navy-900 dark:text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }
          `}
        >
          {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
