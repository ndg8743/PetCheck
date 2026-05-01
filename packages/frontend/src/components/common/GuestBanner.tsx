import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Sticky banner that appears under the app header whenever the current user
 * is a guest. Makes the read-only nature unmistakable so users don't waste
 * effort trying to save data that's about to bounce off requireNonGuest.
 */
export const GuestBanner: React.FC = () => {
  const { user, logout } = useAuth();
  if (!user?.isGuest) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 print:hidden">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-amber-900 dark:text-amber-100">
          <strong>Demo mode</strong> — you're browsing with sample data.
          Sign in with Google to save your own pets, medications, and reminders.
        </span>
        <Link
          to="/login"
          onClick={() => logout()}
          className="shrink-0 inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-50 underline-offset-4 hover:underline"
        >
          Sign in →
        </Link>
      </div>
    </div>
  );
};
