import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner, LoadingScreen } from '../components/ui/LoadingSpinner';
import { SafetyIndicator } from '../components/features/SafetyIndicator';
import { QuickStatus } from '../components/common/SafetyIndicator';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  imageUrl?: string;
  medications: Medication[];
  conditions: string[];
  allergies: string[];
}

interface Medication {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  startDate: string;
}

interface AlertItem {
  id: string;
  type: 'recall' | 'interaction' | 'warning';
  severity: 'high' | 'moderate' | 'low';
  title: string;
  message: string;
  petId?: string;
  date: string;
}

const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: 'primary' | 'secondary' | 'warning' | 'accent';
}> = ({ icon, label, onClick, color }) => {
  const colorClasses = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 border-primary-200 dark:border-primary-800',
    secondary: 'bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-900/30 border-secondary-200 dark:border-secondary-800',
    warning: 'bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400 hover:bg-warning-100 dark:hover:bg-warning-900/30 border-warning-200 dark:border-warning-800',
    accent: 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 hover:bg-accent-100 dark:hover:bg-accent-900/30 border-accent-200 dark:border-accent-800',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${colorClasses[color]}`}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 flex items-center justify-center">{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </button>
  );
};

export const DashboardPage: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Load pets from localStorage
      const savedPets = localStorage.getItem('petcheck_pets');
      if (savedPets) {
        const petData = JSON.parse(savedPets);
        // Transform to dashboard format with empty medications/conditions
        const dashboardPets = petData.map((pet: any) => ({
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age: pet.age || 0,
          weight: pet.weight || 0,
          imageUrl: pet.imageUrl,
          medications: pet.medications || [],
          conditions: pet.conditions || [],
          allergies: pet.allergies || [],
        }));
        setPets(dashboardPets);
      } else {
        setPets([]);
      }

      // No fake alerts - start empty
      setAlerts([]);

      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  const getSeverityVariant = (severity: string): 'danger' | 'warning' | 'info' => {
    switch (severity) {
      case 'high': return 'danger';
      case 'moderate': return 'warning';
      default: return 'info';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'recall':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'interaction':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  const getSafetyScore = (pet: Pet): number => {
    let score = 100;
    const petAlerts = alerts.filter(a => a.petId === pet.id);
    petAlerts.forEach(alert => {
      if (alert.severity === 'high') score -= 20;
      else if (alert.severity === 'moderate') score -= 10;
      else score -= 5;
    });
    return Math.max(0, score);
  };

  const getSafetyLevel = (score: number): 'safe' | 'caution' | 'warning' | 'danger' => {
    if (score >= 80) return 'safe';
    if (score >= 60) return 'caution';
    if (score >= 40) return 'warning';
    return 'danger';
  };

  if (loading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-navy-900 flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full">
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-accent-600 dark:text-accent-400 mb-4 font-medium">{error}</p>
            <Button onClick={fetchDashboardData}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor your pets' health and safety at a glance</p>
        </div>

        {/* Active Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-8 animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-navy-900 dark:text-white">Active Alerts</h2>
              <Badge variant="danger" dot>{alerts.length}</Badge>
            </div>
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const pet = pets.find(p => p.id === alert.petId);
                const variant = getSeverityVariant(alert.severity);
                return (
                  <Alert
                    key={alert.id}
                    variant={variant}
                    icon={getAlertIcon(alert.type)}
                    className="animate-fade-up"
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between gap-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold">{alert.title}</span>
                          <Badge variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'secondary'} size="sm">
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm opacity-90 mb-1">{alert.message}</p>
                        <div className="flex items-center gap-3 text-xs opacity-75">
                          {pet && <span>Pet: {pet.name}</span>}
                          <span>{alert.date}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        View
                      </Button>
                    </div>
                  </Alert>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionCard
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
              label="Add Pet"
              onClick={() => navigate('/pets/new')}
              color="primary"
            />
            <QuickActionCard
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
              label="Search Drugs"
              onClick={() => navigate('/drugs/search')}
              color="secondary"
            />
            <QuickActionCard
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
              label="Check Interactions"
              onClick={() => navigate('/interactions')}
              color="warning"
            />
            <QuickActionCard
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
              label="View Recalls"
              onClick={() => navigate('/recalls')}
              color="accent"
            />
          </div>
        </div>

        {/* Pet Profiles Overview */}
        <div className="mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-navy-900 dark:text-white">My Pets</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pets')} rightIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            }>
              View All
            </Button>
          </div>

          {pets.length === 0 ? (
            <Card variant="elevated">
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" viewBox="0 0 32 32" fill="currentColor">
                    <circle cx="16" cy="20" r="6" />
                    <circle cx="10" cy="14" r="3" />
                    <circle cx="22" cy="14" r="3" />
                    <circle cx="7" cy="19" r="2.5" />
                    <circle cx="25" cy="19" r="2.5" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">No Pets Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Add your first pet to start monitoring their medication safety
                </p>
                <Button onClick={() => navigate('/pets/new')}>Add Your First Pet</Button>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {pets.map((pet, index) => {
                const safetyScore = getSafetyScore(pet);
                const safetyLevel = getSafetyLevel(safetyScore);
                const petAlerts = alerts.filter(a => a.petId === pet.id);

                return (
                  <Card
                    key={pet.id}
                    variant="elevated"
                    hover
                    className="cursor-pointer animate-fade-up"
                    style={{ animationDelay: `${0.25 + index * 0.05}s` }}
                    onClick={() => navigate(`/pets/${pet.id}`)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-4">
                          {pet.imageUrl ? (
                            <img
                              src={pet.imageUrl}
                              alt={pet.name}
                              className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                              {pet.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="text-xl font-bold text-navy-900 dark:text-white">{pet.name}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{pet.breed}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" size="sm">{pet.species}</Badge>
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                {pet.age}y • {pet.weight}lbs
                              </span>
                            </div>
                          </div>
                        </div>
                        <SafetyIndicator score={safetyScore} variant="badge" size="md" />
                      </div>

                      <div className="space-y-4">
                        {/* Medications */}
                        <div>
                          <h4 className="text-sm font-semibold text-navy-900 dark:text-white mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            Medications ({pet.medications.length})
                          </h4>
                          {pet.medications.length > 0 ? (
                            <div className="space-y-1">
                              {pet.medications.slice(0, 2).map((med) => (
                                <div key={med.id} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                                  <span>{med.drugName} - {med.dosage}</span>
                                </div>
                              ))}
                              {pet.medications.length > 2 && (
                                <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                                  +{pet.medications.length - 2} more
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-500">No medications</p>
                          )}
                        </div>

                        {/* Conditions */}
                        {pet.conditions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-navy-900 dark:text-white mb-2">Conditions</h4>
                            <div className="flex flex-wrap gap-2">
                              {pet.conditions.map((condition, idx) => (
                                <Badge key={idx} variant="secondary" size="sm">
                                  {condition}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Alerts */}
                        {petAlerts.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-navy-900 dark:text-white mb-2">
                              Active Alerts ({petAlerts.length})
                            </h4>
                            <div className="flex gap-2">
                              {petAlerts.map((alert) => (
                                <Badge key={alert.id} variant={getSeverityVariant(alert.severity) === 'danger' ? 'danger' : getSeverityVariant(alert.severity) === 'warning' ? 'warning' : 'info'} size="sm">
                                  {alert.type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pets/${pet.id}`);
                          }}
                          rightIcon={
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          }
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
