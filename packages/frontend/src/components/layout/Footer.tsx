import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Drug Search', href: '/drugs' },
      { label: 'Recalls', href: '/recalls' },
      { label: 'Interaction Checker', href: '/interaction-checker' },
      { label: 'Find a Vet', href: '/find-vet' },
    ],
    resources: [
      { label: 'FAQ', href: '#' },
      { label: 'API Documentation', href: '#' },
      { label: 'FDA OpenFDA', href: 'https://open.fda.gov', external: true },
    ],
    legal: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Contact Us', href: '#' },
    ],
  };

  return (
    <footer className="bg-navy-900 dark:bg-navy-950 text-gray-300 mt-auto">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <svg
                viewBox="0 0 32 32"
                className="w-8 h-8 text-primary-400"
                fill="currentColor"
              >
                <circle cx="16" cy="20" r="6" />
                <circle cx="10" cy="14" r="3" />
                <circle cx="22" cy="14" r="3" />
                <circle cx="7" cy="19" r="2.5" />
                <circle cx="25" cy="19" r="2.5" />
              </svg>
              <span className="text-xl font-bold font-display text-white">
                Pet<span className="text-primary-400">Check</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 mb-4 max-w-xs">
              FDA Animal Drug Safety Explorer - Helping pet owners and veterinary professionals make informed decisions.
            </p>
            {/* Trust badges */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-800 text-xs text-gray-400">
                <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                FDA Data
              </div>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      {link.label}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-warning-900/20 border border-warning-800/30">
            <svg
              className="h-5 w-5 text-warning-400 flex-shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-warning-200">
              <strong className="font-semibold">Medical Disclaimer:</strong> PetCheck is for informational purposes only
              and does not provide veterinary medical advice, diagnosis, or treatment. Always consult with a
              licensed veterinarian before making decisions about your pet's health or medications.
            </p>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>&copy; {currentYear} PetCheck. All rights reserved.</p>
            <p>Data sourced from FDA OpenFDA API</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Compact footer for simple pages
export const FooterCompact: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-navy-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <p>&copy; {currentYear} PetCheck. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Privacy
            </Link>
            <Link to="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Terms
            </Link>
            <Link to="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
