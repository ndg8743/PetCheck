import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const speciesOptions = [
  { value: 'dog', label: 'Dog', icon: '🐕' },
  { value: 'cat', label: 'Cat', icon: '🐈' },
  { value: 'bird', label: 'Bird', icon: '🐦' },
  { value: 'rabbit', label: 'Rabbit', icon: '🐰' },
  { value: 'horse', label: 'Horse', icon: '🐴' },
  { value: 'other', label: 'Other', icon: '🐾' },
];

export const PetCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    birthDate: '',
    weight: '',
    sex: '',
    color: '',
    microchipId: '',
    notes: '',
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSpeciesSelect = (species: string) => {
    setFormData(prev => ({ ...prev, species }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create new pet object
      const newPet = {
        id: Date.now().toString(),
        name: formData.name,
        species: formData.species.charAt(0).toUpperCase() + formData.species.slice(1),
        breed: formData.breed,
        age: formData.birthDate ? Math.floor((Date.now() - new Date(formData.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
        weight: parseFloat(formData.weight) || 0,
        imageUrl: photoPreview || undefined,
        medicationCount: 0,
        conditionCount: 0,
        allergyCount: 0,
        birthDate: formData.birthDate,
        sex: formData.sex,
        color: formData.color,
        microchipId: formData.microchipId,
        notes: formData.notes,
      };

      // Save to localStorage
      const existingPets = JSON.parse(localStorage.getItem('petcheck_pets') || '[]');
      existingPets.push(newPet);
      localStorage.setItem('petcheck_pets', JSON.stringify(existingPets));

      // Navigate to the pet list
      navigate('/pets');
    } catch (err) {
      setError('Failed to create pet profile. Please try again.');
      setLoading(false);
    }
  };

  const calculateAge = () => {
    if (!formData.birthDate) return null;
    const birth = new Date(formData.birthDate);
    const today = new Date();
    const ageYears = today.getFullYear() - birth.getFullYear();
    const ageMonths = today.getMonth() - birth.getMonth();

    if (ageYears === 0) {
      return `${ageMonths} month${ageMonths !== 1 ? 's' : ''} old`;
    }
    return `${ageYears} year${ageYears !== 1 ? 's' : ''} old`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/pets')}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-6 animate-fade-up"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Pets</span>
          </button>

          {/* Header */}
          <div className="mb-8 animate-fade-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/25">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-navy-900 dark:text-white">
                  Add New Pet
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Create a profile to track medications and health
                </p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <Card variant="elevated" className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              {error && (
                <Alert variant="error" className="mb-6">
                  {error}
                </Alert>
              )}

              {/* Species Selection */}
              <div className="mb-8">
                <h2 className="text-lg font-display font-semibold text-navy-900 dark:text-white mb-4">
                  What type of pet?
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {speciesOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSpeciesSelect(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        formData.species === option.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-slate-200 dark:border-navy-700 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-navy-800'
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.icon}</div>
                      <div className={`text-sm font-medium ${
                        formData.species === option.value
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {option.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pet Photo */}
              <div className="mb-8">
                <h2 className="text-lg font-display font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Pet Photo
                </h2>

                <div className="flex flex-col items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="pet-photo"
                  />

                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Pet preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary-200 dark:border-primary-800 shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                        aria-label="Remove photo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="pet-photo"
                      className="w-32 h-32 rounded-full border-2 border-dashed border-slate-300 dark:border-navy-600 hover:border-primary-400 dark:hover:border-primary-500 bg-slate-50 dark:bg-navy-800 flex flex-col items-center justify-center cursor-pointer transition-colors"
                    >
                      <svg className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-xs text-slate-500 dark:text-slate-400 text-center px-2">Add Photo</span>
                    </label>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                    Optional - JPG, PNG up to 5MB
                  </p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="mb-8">
                <h2 className="text-lg font-display font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Basic Information
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Pet Name"
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Max, Luna, Charlie"
                    required
                  />

                  <Input
                    label="Breed"
                    id="breed"
                    name="breed"
                    type="text"
                    value={formData.breed}
                    onChange={handleChange}
                    placeholder="e.g., Golden Retriever, Siamese"
                    required
                  />

                  <div>
                    <Input
                      label="Birth Date"
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={handleChange}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                    {formData.birthDate && (
                      <p className="text-sm text-primary-600 dark:text-primary-400 mt-1 font-medium">
                        Age: {calculateAge()}
                      </p>
                    )}
                  </div>

                  <Input
                    label="Weight (lbs)"
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="e.g., 45.5"
                    required
                  />

                  <Select
                    label="Sex"
                    id="sex"
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="male-neutered">Male (Neutered)</option>
                    <option value="female-spayed">Female (Spayed)</option>
                  </Select>

                  <Input
                    label="Color/Markings"
                    id="color"
                    name="color"
                    type="text"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="e.g., Brown and white, Tabby"
                  />
                </div>
              </div>

              {/* Identification */}
              <div className="mb-8">
                <h2 className="text-lg font-display font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Identification
                </h2>

                <Input
                  label="Microchip ID (Optional)"
                  id="microchipId"
                  name="microchipId"
                  type="text"
                  value={formData.microchipId}
                  onChange={handleChange}
                  placeholder="15-digit microchip number"
                  helperText="The microchip number can usually be found on your pet's vaccination records"
                />
              </div>

              {/* Additional Notes */}
              <div className="mb-8">
                <h2 className="text-lg font-display font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Additional Notes
                </h2>

                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl text-navy-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                    placeholder="Any additional information about your pet (e.g., behavioral notes, special care requirements)"
                  />
                </div>
              </div>

              {/* Next Steps Info */}
              <Alert variant="info" className="mb-8">
                <div>
                  <p className="font-semibold mb-2">After creating your pet's profile, you'll be able to:</p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Add current medications
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Record medical conditions and allergies
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Check for drug interactions
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Receive safety alerts and recall notifications
                    </li>
                  </ul>
                </div>
              </Alert>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 justify-center"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Pet Profile
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/pets')}
                  disabled={loading}
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>

          {/* Privacy Note */}
          <div className="mt-6 text-center animate-fade-up" style={{ animationDelay: '150ms' }}>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              All information is kept private and secure. You can edit or delete this profile at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
