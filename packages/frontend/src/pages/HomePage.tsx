import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SearchBar } from '../components/common/SearchBar';
import { Disclaimer, TrustIndicator } from '../components/common/Disclaimer';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    navigate(`/drugs/search?q=${encodeURIComponent(query)}`);
  };

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      title: 'Drug Safety Search',
      description: 'Search FDA adverse event reports for veterinary drugs to make informed decisions.',
      color: 'primary',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      title: 'Pet Profiles',
      description: 'Manage multiple pet profiles with medications, conditions, and allergies.',
      color: 'secondary',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Interaction Checker',
      description: 'Check for potential drug interactions before administering medications.',
      color: 'warning',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      title: 'Recall Alerts',
      description: 'Stay informed about the latest FDA recalls affecting veterinary products.',
      color: 'accent',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Safety Analytics',
      description: 'View adverse event trends and safety data visualizations.',
      color: 'primary',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Vet Finder',
      description: 'Locate veterinary clinics near you for professional care.',
      color: 'secondary',
    },
  ];

  const recentRecalls = [
    {
      id: 1,
      productName: 'ProHeart 6',
      manufacturer: 'Zoetis',
      date: '2024-11-15',
      severity: 'moderate',
    },
    {
      id: 2,
      productName: "Hill's Prescription Diet",
      manufacturer: "Hill's Pet Nutrition",
      date: '2024-11-10',
      severity: 'high',
    },
    {
      id: 3,
      productName: 'Purina Pro Plan Veterinary Diets',
      manufacturer: 'Nestlé Purina',
      date: '2024-11-05',
      severity: 'low',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400';
      case 'secondary':
        return 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400';
      case 'warning':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400';
      case 'accent':
        return 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-primary-900">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <svg viewBox="0 0 32 32" className="w-12 h-12 text-primary-400" fill="currentColor">
                <circle cx="16" cy="20" r="6" />
                <circle cx="10" cy="14" r="3" />
                <circle cx="22" cy="14" r="3" />
                <circle cx="7" cy="19" r="2.5" />
                <circle cx="25" cy="19" r="2.5" />
              </svg>
              <h1 className="text-4xl lg:text-6xl font-bold text-white font-display">
                Pet<span className="text-primary-400">Check</span>
              </h1>
            </div>

            <p className="text-xl lg:text-2xl text-primary-200 mb-4 font-display">
              FDA-Powered Veterinary Drug Safety Database
            </p>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
              Make informed decisions about your pet's medications with access to FDA adverse event reports,
              drug interactions, and recall alerts.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search for a veterinary drug (e.g., Apoquel, Bravecto, Heartgard)"
                variant="hero"
                size="lg"
                suggestions={['Apoquel', 'Bravecto', 'Heartgard', 'Simparica', 'Trifexis']}
              />
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <TrustIndicator />
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto">
            <path
              d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z"
              className="fill-gray-50 dark:fill-navy-900"
            />
          </svg>
        </div>
      </section>

      {/* Recent Recalls Alert Section */}
      <section className="py-12 bg-accent-50 dark:bg-accent-900/10 border-y border-accent-200 dark:border-accent-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-100 dark:bg-accent-900/30">
                <svg className="w-6 h-6 text-accent-600 dark:text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-navy-900 dark:text-white font-display">Recent Recalls</h2>
            </div>
            <Button variant="outline" onClick={() => navigate('/recalls')}>
              View All Recalls
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {recentRecalls.map((recall, index) => (
              <Card
                key={recall.id}
                variant={recall.severity === 'high' ? 'danger' : recall.severity === 'moderate' ? 'warning' : 'default'}
                hover
                onClick={() => navigate('/recalls')}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={recall.severity === 'high' ? 'danger' : recall.severity === 'moderate' ? 'warning' : 'secondary'}>
                      {recall.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{recall.date}</span>
                  </div>
                  <h3 className="font-semibold text-navy-900 dark:text-white mb-1 font-display">{recall.productName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{recall.manufacturer}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold text-navy-900 dark:text-white mb-4 font-display">
              Everything You Need for Pet Safety
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Comprehensive tools to help you make informed decisions about your pet's health
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                hover
                className="animate-fade-up"
                style={{ animationDelay: `${index * 75}ms` } as React.CSSProperties}
              >
                <div className="p-6">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${getColorClasses(feature.color)}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white dark:bg-navy-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-center text-navy-900 dark:text-white mb-12 font-display">
            How It Works
          </h2>

          <div className="space-y-8">
            {[
              {
                step: 1,
                title: 'Search Drug Information',
                description: 'Enter any veterinary drug name to access FDA adverse event reports and safety data.',
              },
              {
                step: 2,
                title: 'Create Pet Profiles',
                description: 'Add your pets with their medications, conditions, and allergies for personalized monitoring.',
              },
              {
                step: 3,
                title: 'Check Interactions & Safety',
                description: 'Use our interaction checker to identify potential drug conflicts and safety concerns.',
              },
              {
                step: 4,
                title: 'Stay Informed',
                description: 'Receive alerts about recalls and new safety information relevant to your pets.',
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className="flex gap-6 items-start animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
              >
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 font-display">
            Ready to Keep Your Pets Safe?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Join PetCheck today and get instant access to comprehensive veterinary drug safety data.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-white text-primary-600 hover:bg-gray-100"
            >
              Sign Up / Login
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/drugs')}
              className="border-white text-white hover:bg-white/10"
            >
              Continue as Guest
            </Button>
          </div>
          <p className="mt-4 text-sm text-primary-200">
            No account needed to search drugs, check recalls, or find vets
          </p>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <section className="py-8 bg-gray-100 dark:bg-navy-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Disclaimer variant="inline" />
        </div>
      </section>
    </div>
  );
};
