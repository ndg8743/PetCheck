import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '../ui/Badge';

export interface HeaderProps {
  userMode: 'owner' | 'researcher';
  onModeToggle: () => void;
  userName?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userMode,
  onModeToggle,
  userName,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle dark mode
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isUserMenuOpen && !(e.target as Element).closest('.user-menu')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isUserMenuOpen]);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/drugs', label: 'Drug Search' },
    { href: '/recalls', label: 'Recalls' },
    { href: '/my-pets', label: 'My Pets' },
    ...(userMode === 'researcher' ? [{ href: '/researcher', label: 'Analytics' }] : []),
  ];

  return (
    <header
      className={`
        sticky top-0 z-40
        transition-all duration-300
        ${
          isScrolled
            ? 'bg-white/80 dark:bg-navy-900/80 backdrop-blur-xl shadow-sm'
            : 'bg-white dark:bg-navy-900'
        }
        border-b border-gray-200/80 dark:border-gray-700/80
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              {/* Paw Icon */}
              <div className="relative">
                <svg
                  viewBox="0 0 32 32"
                  className="w-8 h-8 text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-110"
                  fill="currentColor"
                >
                  <circle cx="16" cy="20" r="6" />
                  <circle cx="10" cy="14" r="3" />
                  <circle cx="22" cy="14" r="3" />
                  <circle cx="7" cy="19" r="2.5" />
                  <circle cx="25" cy="19" r="2.5" />
                </svg>
              </div>
              <span className="text-xl font-bold font-display text-navy-900 dark:text-white">
                Pet<span className="text-primary-600 dark:text-primary-400">Check</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:ml-10 lg:flex lg:space-x-1" aria-label="Main navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${
                      location.pathname === link.href ||
                      location.pathname.startsWith(link.href + '/')
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <button
              onClick={onModeToggle}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <span className="text-xs text-gray-500 dark:text-gray-400">Mode:</span>
              <Badge
                variant={userMode === 'owner' ? 'primary' : 'success'}
                size="sm"
              >
                {userMode === 'owner' ? 'Pet Owner' : 'Researcher'}
              </Badge>
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="
                p-2 rounded-lg
                text-gray-500 hover:text-gray-700
                dark:text-gray-400 dark:hover:text-gray-200
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                dark:focus:ring-offset-navy-900
              "
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {/* User Menu */}
            <div className="relative user-menu">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="
                  flex items-center gap-2 p-1.5 rounded-lg
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  dark:focus:ring-offset-navy-900
                "
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                <div className="
                  h-8 w-8 rounded-full
                  bg-gradient-to-br from-primary-500 to-primary-600
                  flex items-center justify-center
                  text-white font-medium text-sm
                  ring-2 ring-white dark:ring-navy-800
                ">
                  {userName?.[0]?.toUpperCase() || 'U'}
                </div>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div
                  className="
                    absolute right-0 mt-2 w-56
                    bg-white dark:bg-navy-800
                    rounded-xl shadow-elevated
                    border border-gray-200 dark:border-gray-700
                    overflow-hidden
                    animate-scale-in origin-top-right
                    z-50
                  "
                  role="menu"
                >
                  {userName && (
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-navy-900 dark:text-white">
                        {userName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {userMode === 'owner' ? 'Pet Owner' : 'Researcher'} Account
                      </p>
                    </div>
                  )}
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="
                        flex items-center gap-3 px-4 py-2.5
                        text-sm text-gray-700 dark:text-gray-300
                        hover:bg-gray-50 dark:hover:bg-gray-700/50
                        transition-colors
                      "
                      role="menuitem"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <Link
                      to="/my-pets"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="
                        flex items-center gap-3 px-4 py-2.5
                        text-sm text-gray-700 dark:text-gray-300
                        hover:bg-gray-50 dark:hover:bg-gray-700/50
                        transition-colors
                      "
                      role="menuitem"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      My Pets
                    </Link>
                    <button
                      onClick={onModeToggle}
                      className="
                        w-full flex items-center gap-3 px-4 py-2.5
                        text-sm text-gray-700 dark:text-gray-300
                        hover:bg-gray-50 dark:hover:bg-gray-700/50
                        transition-colors
                      "
                      role="menuitem"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Switch to {userMode === 'owner' ? 'Researcher' : 'Pet Owner'}
                    </button>
                  </div>
                  {onLogout && (
                    <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="
                          w-full flex items-center gap-3 px-4 py-2.5
                          text-sm text-accent-600 dark:text-accent-400
                          hover:bg-accent-50 dark:hover:bg-accent-900/20
                          transition-colors
                        "
                        role="menuitem"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
