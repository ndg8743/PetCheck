import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface SidebarLink {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'danger' | 'warning' | 'success';
}

export interface SidebarSection {
  title?: string;
  links: SidebarLink[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  isOpen = true,
  onClose,
}) => {
  const location = useLocation();

  const badgeVariantClasses = {
    default: 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300',
    danger: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
    success: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300',
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 lg:top-16
          h-screen lg:h-[calc(100vh-4rem)]
          z-40 lg:z-0
          transition-transform duration-300 ease-out-expo
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-64 flex-shrink-0
          bg-white dark:bg-navy-800
          border-r border-gray-200 dark:border-gray-700
          lg:bg-transparent lg:dark:bg-transparent
          lg:border-r-0
        `}
        aria-label="Sidebar navigation"
      >
        <div className="h-full flex flex-col">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-lg font-semibold font-display text-navy-900 dark:text-white">
              Menu
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-6' : ''}>
                {section.title && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                <ul className="space-y-1">
                  {section.links.map((link) => {
                    const isActive =
                      location.pathname === link.href ||
                      location.pathname.startsWith(link.href + '/');

                    return (
                      <li key={link.id}>
                        <Link
                          to={link.href}
                          onClick={onClose}
                          className={`
                            group flex items-center justify-between
                            px-3 py-2.5 rounded-lg
                            text-sm font-medium
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                            dark:focus:ring-offset-navy-800
                            ${
                              isActive
                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50'
                            }
                          `}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`
                                w-5 h-5 transition-colors
                                ${
                                  isActive
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
                                }
                              `}
                            >
                              {link.icon}
                            </span>
                            <span>{link.label}</span>
                          </div>
                          {link.badge !== undefined && (
                            <span
                              className={`
                                inline-flex items-center justify-center
                                px-2 py-0.5 text-xs font-medium rounded-full
                                ${badgeVariantClasses[link.badgeVariant || 'default']}
                              `}
                            >
                              {link.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <div className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium">FDA Data</span>
              </div>
              <p className="mt-1 text-xs text-primary-600 dark:text-primary-400">
                Data sourced from openFDA
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

// Default sidebar configuration
export const getDefaultSidebarSections = (userMode: 'owner' | 'researcher'): SidebarSection[] => {
  const ownerSections: SidebarSection[] = [
    {
      title: 'Main',
      links: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          href: '/dashboard',
          icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          id: 'my-pets',
          label: 'My Pets',
          href: '/my-pets',
          icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Drug Safety',
      links: [
        {
          id: 'drug-search',
          label: 'Drug Search',
          href: '/drugs',
          icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ),
        },
        {
          id: 'interaction-checker',
          label: 'Interaction Checker',
          href: '/interaction-checker',
          icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          id: 'recalls',
          label: 'Recalls',
          href: '/recalls',
          badge: 'New',
          badgeVariant: 'danger' as const,
          icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Resources',
      links: [
        {
          id: 'find-vet',
          label: 'Find a Vet',
          href: '/find-vet',
          icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    },
  ];

  if (userMode === 'researcher') {
    ownerSections.push({
      title: 'Research',
      links: [
        {
          id: 'analytics',
          label: 'Analytics',
          href: '/researcher',
          icon: (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
      ],
    });
  }

  return ownerSections;
};
