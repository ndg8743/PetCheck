import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const quickLinks = [
    {
      label: 'Home',
      path: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      color: 'primary'
    },
    {
      label: 'Search Drugs',
      path: '/drugs/search',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      color: 'secondary'
    },
    {
      label: 'My Pets',
      path: '/pets',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="14" r="4" />
          <circle cx="8" cy="10" r="2" />
          <circle cx="16" cy="10" r="2" />
          <circle cx="6" cy="13" r="1.5" />
          <circle cx="18" cy="13" r="1.5" />
        </svg>
      ),
      color: 'warning'
    },
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'accent'
    },
  ];

  const colorClasses: Record<string, string> = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 border-primary-200 dark:border-primary-800',
    secondary: 'bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-900/30 border-secondary-200 dark:border-secondary-800',
    warning: 'bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-900/30 border-warning-200 dark:border-warning-800',
    accent: 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 hover:bg-accent-100 dark:hover:bg-accent-900/30 border-accent-200 dark:border-accent-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl animate-fade-up">
        <Card variant="elevated" className="overflow-hidden">
          <div className="p-8 lg:p-12 text-center">
            {/* 404 Illustration */}
            <div className="mb-8">
              <div className="relative inline-block">
                <span className="text-[120px] lg:text-[160px] font-bold font-display bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600 bg-clip-text text-transparent">
                  404
                </span>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                  <svg className="w-16 h-16 text-warning-500 animate-bounce" viewBox="0 0 64 64" fill="currentColor">
                    <circle cx="32" cy="40" r="12" />
                    <circle cx="20" cy="28" r="6" />
                    <circle cx="44" cy="28" r="6" />
                    <circle cx="14" cy="38" r="5" />
                    <circle cx="50" cy="38" r="5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-3xl lg:text-4xl font-bold text-navy-900 dark:text-white font-display mb-4">
              Oops! Page Not Found
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              Looks like this page went walkies! We couldn't find what you're looking for.
            </p>

            {/* Suggestions */}
            <div className="mb-8 text-left max-w-md mx-auto">
              <p className="text-sm font-semibold text-navy-900 dark:text-white mb-3">
                This might have happened because:
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 mt-2"></span>
                  <span>The page you're looking for has been moved or deleted</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 mt-2"></span>
                  <span>You may have typed the URL incorrectly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 mt-2"></span>
                  <span>The link you clicked might be outdated</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mb-8 flex-wrap">
              <Button
                onClick={() => navigate('/')}
                size="lg"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
              >
                Go to Home
              </Button>
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                size="lg"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                }
              >
                Go Back
              </Button>
            </div>

            {/* Quick Links */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <p className="text-sm font-semibold text-navy-900 dark:text-white mb-4">
                Or try one of these popular pages:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`p-4 rounded-xl border transition-all duration-200 ${colorClasses[link.color]}`}
                  >
                    <div className="mb-2">{link.icon}</div>
                    <div className="text-sm font-medium">{link.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Suggestion */}
            <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong className="text-navy-900 dark:text-white">Looking for drug information?</strong>{' '}
                Try using our{' '}
                <button
                  onClick={() => navigate('/drugs/search')}
                  className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  drug search tool
                </button>{' '}
                to find what you need.
              </p>
            </div>
          </div>
        </Card>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Still can't find what you're looking for?
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <button
              onClick={() => navigate('/contact')}
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Contact Support
            </button>
            <span className="text-gray-400">•</span>
            <button
              onClick={() => navigate('/faq')}
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Visit FAQ
            </button>
            <span className="text-gray-400">•</span>
            <button
              onClick={() => navigate('/help')}
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Help Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
