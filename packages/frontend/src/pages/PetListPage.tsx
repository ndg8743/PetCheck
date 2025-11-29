import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { LoadingScreen } from '../components/ui/LoadingSpinner';
import { Modal, ConfirmDialog } from '../components/ui/Modal';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  imageUrl?: string;
  medicationCount: number;
  conditionCount: number;
  allergyCount: number;
  lastCheckup?: string;
}

export const PetListPage: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; petId: string; petName: string }>({ open: false, petId: '', petName: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    filterPets();
  }, [pets, searchQuery, speciesFilter]);

  const fetchPets = async () => {
    try {
      setLoading(true);
      setTimeout(() => {
        setPets([
          { id: '1', name: 'Max', species: 'Dog', breed: 'Golden Retriever', age: 5, weight: 65, medicationCount: 2, conditionCount: 2, allergyCount: 1, lastCheckup: '2024-10-15' },
          { id: '2', name: 'Luna', species: 'Cat', breed: 'Siamese', age: 3, weight: 10, medicationCount: 1, conditionCount: 1, allergyCount: 0, lastCheckup: '2024-11-01' },
          { id: '3', name: 'Charlie', species: 'Dog', breed: 'Beagle', age: 7, weight: 25, medicationCount: 3, conditionCount: 3, allergyCount: 2, lastCheckup: '2024-09-20' },
          { id: '4', name: 'Bella', species: 'Cat', breed: 'Persian', age: 2, weight: 8, medicationCount: 0, conditionCount: 0, allergyCount: 0, lastCheckup: '2024-11-10' },
        ]);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to load pets. Please try again.');
      setLoading(false);
    }
  };

  const filterPets = () => {
    let filtered = [...pets];
    if (searchQuery) {
      filtered = filtered.filter(pet =>
        pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pet.breed.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (speciesFilter) {
      filtered = filtered.filter(pet =>
        pet.species.toLowerCase() === speciesFilter.toLowerCase()
      );
    }
    setFilteredPets(filtered);
  };

  const handleDeletePet = async () => {
    try {
      setPets(pets.filter(p => p.id !== deleteConfirm.petId));
      setDeleteConfirm({ open: false, petId: '', petName: '' });
    } catch (err) {
      alert('Failed to delete pet. Please try again.');
    }
  };

  const getSpeciesIcon = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 4c-1.5 0-3 .5-4 2-1-1.5-2.5-2-4-2-3 0-6 2.5-6 7 0 5 4 8.5 10 12 6-3.5 10-7 10-12 0-4.5-3-7-6-7z"/>
          </svg>
        );
      case 'cat':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your pets..." />;
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
            <Button onClick={fetchPets}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-up">
          <div>
            <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-2">My Pets</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your pet profiles and track their medications
            </p>
          </div>
          <Button
            onClick={() => navigate('/pets/new')}
            className="whitespace-nowrap shrink-0"
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          >
            Add New Pet
          </Button>
        </div>

        {/* Search and Filters */}
        <Card variant="elevated" className="mb-6 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <div className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder="Search by name or breed"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
              >
                <option value="">All Species</option>
                <option value="dog">Dogs</option>
                <option value="cat">Cats</option>
                <option value="other">Other</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Pet List */}
        {filteredPets.length === 0 ? (
          <Card variant="elevated" className="animate-fade-up">
            <div className="p-12 text-center">
              {pets.length === 0 ? (
                <>
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
                    Add your first pet to start tracking their medications and health
                  </p>
                  <Button onClick={() => navigate('/pets/new')}>Add Your First Pet</Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gray-100 dark:bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">No Results Found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Try adjusting your search terms or filters
                  </p>
                  <Button variant="outline" onClick={() => { setSearchQuery(''); setSpeciesFilter(''); }}>
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPets.map((pet, index) => (
              <Card
                key={pet.id}
                variant="elevated"
                hover
                className="cursor-pointer animate-fade-up"
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                onClick={() => navigate(`/pets/${pet.id}`)}
              >
                <div className="p-6">
                  {/* Pet Avatar */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-4">
                      {pet.imageUrl ? (
                        <img
                          src={pet.imageUrl}
                          alt={pet.name}
                          className="w-16 h-16 rounded-2xl object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                          {pet.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-navy-900 dark:text-white">{pet.name}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{pet.breed}</p>
                        <Badge variant="outline" size="sm" className="mt-1">
                          {pet.species}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Pet Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Age:</span>
                      <span className="font-medium text-navy-900 dark:text-white">{pet.age} years</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                      <span className="font-medium text-navy-900 dark:text-white">{pet.weight} lbs</span>
                    </div>
                    {pet.lastCheckup && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Last Checkup:</span>
                        <span className="font-medium text-navy-900 dark:text-white">{pet.lastCheckup}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                      <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                        {pet.medicationCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Meds</div>
                    </div>
                    <div className="text-center p-2 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
                      <div className="text-xl font-bold text-warning-600 dark:text-warning-400">
                        {pet.conditionCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Conditions</div>
                    </div>
                    <div className="text-center p-2 bg-accent-50 dark:bg-accent-900/20 rounded-xl">
                      <div className="text-xl font-bold text-accent-600 dark:text-accent-400">
                        {pet.allergyCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Allergies</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); navigate(`/pets/${pet.id}`); }}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/pets/${pet.id}/edit`); }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ open: true, petId: pet.id, petName: pet.name });
                      }}
                      className="text-accent-600 hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {pets.length > 0 && (
          <Card variant="elevated" className="mt-8 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-navy-900 dark:text-white mb-4">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{pets.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Pets</div>
                </div>
                <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-900/20 rounded-xl">
                  <div className="text-3xl font-bold text-secondary-600 dark:text-secondary-400">
                    {pets.reduce((sum, pet) => sum + pet.medicationCount, 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active Medications</div>
                </div>
                <div className="text-center p-4 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
                  <div className="text-3xl font-bold text-warning-600 dark:text-warning-400">
                    {pets.reduce((sum, pet) => sum + pet.conditionCount, 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tracked Conditions</div>
                </div>
                <div className="text-center p-4 bg-accent-50 dark:bg-accent-900/20 rounded-xl">
                  <div className="text-3xl font-bold text-accent-600 dark:text-accent-400">
                    {pets.reduce((sum, pet) => sum + pet.allergyCount, 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Known Allergies</div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, petId: '', petName: '' })}
        onConfirm={handleDeletePet}
        title="Delete Pet Profile"
        message={`Are you sure you want to delete ${deleteConfirm.petName}'s profile? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
