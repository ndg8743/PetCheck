import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, SidebarSection, getDefaultSidebarSections } from './Sidebar';
import { Footer, FooterCompact } from './Footer';

export interface LayoutProps {
  children: React.ReactNode;
  sidebarSections?: SidebarSection[];
  userName?: string;
  onLogout?: () => void;
  showSidebar?: boolean;
  showFooter?: boolean;
  compactFooter?: boolean;
  fullWidth?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  sidebarSections,
  userName,
  onLogout,
  showSidebar = true,
  showFooter = true,
  compactFooter = true,
  fullWidth = false,
}) => {
  const [userMode, setUserMode] = useState<'owner' | 'researcher'>('owner');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleModeToggle = () => {
    setUserMode((prev) => (prev === 'owner' ? 'researcher' : 'owner'));
  };

  const sections = sidebarSections || getDefaultSidebarSections(userMode);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-navy-900">
      <Header
        userMode={userMode}
        onModeToggle={handleModeToggle}
        userName={userName}
        onLogout={onLogout}
      />

      <div className="flex flex-1">
        {/* Mobile menu button */}
        {showSidebar && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="
              lg:hidden fixed bottom-4 right-4 z-30
              p-3 rounded-full
              bg-primary-600 text-white
              shadow-elevated hover:bg-primary-700
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            "
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Sidebar */}
        {showSidebar && (
          <Sidebar
            sections={sections}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div
            className={`
              ${fullWidth ? '' : 'max-w-7xl mx-auto'}
              px-4 sm:px-6 lg:px-8 py-6 lg:py-8
            `}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      {showFooter && (compactFooter ? <FooterCompact /> : <Footer />)}
    </div>
  );
};

// Page wrapper for consistent animation
export interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  className = '',
  title,
  description,
  actions,
}) => {
  return (
    <div className={`animate-fade-in ${className}`}>
      {(title || description || actions) && (
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {title && (
                <h1 className="text-2xl lg:text-3xl font-bold text-navy-900 dark:text-white font-display">
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-1 text-gray-600 dark:text-gray-400">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

// Empty state component
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-navy-900 dark:text-white font-display">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

// Section divider
export interface SectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || description || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            {title && (
              <h2 className="text-lg lg:text-xl font-semibold text-navy-900 dark:text-white font-display">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};
