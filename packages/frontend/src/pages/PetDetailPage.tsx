import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { normalizeBreed } from '../lib/petDisplay';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingScreen } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';
import { SafetyIndicator } from '../components/features/SafetyIndicator';
import { ConfirmDialog } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

// One-tap presets for the most common pet meds — saves users typing the
// odd spellings (Apoquel, NexGard, Cefovecin) and gets the route/frequency
// right for the typical use case. User can always tweak after applying.
type MedPreset = {
  label: string;
  drugName: string;
  route: 'oral' | 'topical' | 'injectable';
  dosage: string;
  frequency: string; // matches backend enum
  notes?: string;
};
const MED_PRESETS: MedPreset[] = [
  { label: 'Heartgard',  drugName: 'Heartgard Plus', route: 'oral',    dosage: '1 chew',       frequency: 'monthly' },
  { label: 'Bravecto',   drugName: 'Bravecto',       route: 'oral',    dosage: '1 chew',       frequency: 'custom', notes: 'Every 12 weeks' },
  { label: 'NexGard',    drugName: 'NexGard',        route: 'oral',    dosage: '1 chew',       frequency: 'monthly' },
  { label: 'Apoquel',    drugName: 'Apoquel',        route: 'oral',    dosage: '5.4 mg',       frequency: 'twice_daily' },
  { label: 'Frontline',  drugName: 'Frontline Plus', route: 'topical', dosage: '1 applicator', frequency: 'monthly' },
  { label: 'Carprofen',  drugName: 'Carprofen',      route: 'oral',    dosage: '25 mg',        frequency: 'twice_daily' },
];

// Friendly labels for the medication-frequency enum the backend stores.
const FREQUENCY_LABELS: Record<string, string> = {
  once_daily: 'Once daily',
  twice_daily: 'Twice daily',
  three_times_daily: 'Three times daily',
  four_times_daily: 'Four times daily',
  every_other_day: 'Every other day',
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  monthly: 'Monthly',
  as_needed: 'As needed',
  custom: 'Custom schedule',
};
const formatFrequency = (f: string): string => FREQUENCY_LABELS[f] ?? f;

interface PrimaryVet {
  clinicName?: string;
  address?: string;
  phone?: string;
  placeId?: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  birthDate: string;
  imageUrl?: string;
  veterinarian?: PrimaryVet;
}

interface Medication {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  notes?: string;
}

interface Condition {
  id: string;
  name: string;
  diagnosedDate: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export const PetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuest = !!user?.isGuest;
  const [pet, setPet] = useState<Pet | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [deletingMedicationId, setDeletingMedicationId] = useState<string | null>(null);
  // Interaction precheck state — when adding a new med produces a high/medium
  // severity warning, we stash the pending payload and show a ConfirmDialog
  // before actually persisting.
  const [pendingMedication, setPendingMedication] = useState<any | null>(null);
  const [interactionWarnings, setInteractionWarnings] = useState<Array<{ severity?: string; [k: string]: any }>>([]);

  // Medication form state
  const [medicationForm, setMedicationForm] = useState({
    drugName: '',
    dosage: '',
    frequency: '',
    route: 'oral',
    startDate: new Date().toISOString().split('T')[0],
    prescribedBy: '',
    notes: '',
  });

  useEffect(() => {
    fetchPetDetails();
  }, [id]);

  const fetchPetDetails = async () => {
    try {
      setLoading(true);

      // Load pet from API
      const response = await api.get(`/pets/${id}`);
      const petData = response.data.data;

      if (petData) {
        // Calculate age from dateOfBirth or approximateAge
        let age = 0;
        if (petData.dateOfBirth) {
          const birthDate = new Date(petData.dateOfBirth);
          const today = new Date();
          age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        } else if (petData.approximateAge) {
          age = petData.approximateAge.value;
        }

        setPet({
          id: petData.id,
          name: petData.name,
          species: petData.species || 'Dog',
          breed: normalizeBreed(petData.breed),
          age: age,
          weight: petData.weight?.value || 0,
          birthDate: petData.dateOfBirth || '',
          imageUrl: petData.profileImageUrl,
          veterinarian: petData.veterinarian,
        });

        // Map medications from API
        const mappedMeds = (petData.currentMedications || []).map((med: any) => ({
          id: med.id,
          drugName: med.drugName,
          dosage: `${med.dosage?.amount || ''} ${med.dosage?.unit || ''}`.trim(),
          frequency: med.frequency,
          route: med.route || 'oral',
          startDate: med.startDate || '',
          endDate: med.endDate,
          prescribedBy: med.prescribedBy || '',
          notes: med.notes,
        }));
        setMedications(mappedMeds);

        // Map conditions from API
        const mappedConditions = (petData.medicalConditions || []).map((cond: any) => ({
          id: cond.id,
          name: cond.name,
          diagnosedDate: cond.diagnosedDate || '',
          severity: cond.severity || 'mild',
          notes: cond.notes,
        }));
        setConditions(mappedConditions);

        // Map allergies from API
        const mappedAllergies = (petData.allergies || []).map((allergy: any) => ({
          id: allergy.id,
          allergen: allergy.allergen,
          reaction: allergy.reaction || '',
          severity: allergy.severity || 'mild',
        }));
        setAllergies(mappedAllergies);

        setLoading(false);
        return;
      }

      // Pet not found
      setError('Pet not found');
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load pet details:', err);
      setError(err.response?.data?.message || 'Failed to load pet details. Please try again.');
      setLoading(false);
    }
  };

  const persistMedication = async (medicationData: any) => {
    if (editingMedication) {
      await api.patch(`/pets/${id}/medications/${editingMedication.id}`, medicationData);
    } else {
      await api.post(`/pets/${id}/medications`, medicationData);
    }
    await fetchPetDetails();
    resetMedicationForm();
    setPendingMedication(null);
    setInteractionWarnings([]);
  };

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Parse dosage into amount and unit
      const dosageParts = medicationForm.dosage.trim().split(/\s+/);
      const dosageAmount = parseFloat(dosageParts[0]) || 0;
      const dosageUnit = dosageParts.slice(1).join(' ') || 'mg';

      const medicationData = {
        drugName: medicationForm.drugName,
        dosage: {
          amount: dosageAmount,
          unit: dosageUnit,
        },
        frequency: medicationForm.frequency || 'once_daily',
        route: medicationForm.route,
        startDate: medicationForm.startDate || undefined,
        prescribedBy: medicationForm.prescribedBy || undefined,
        notes: medicationForm.notes || undefined,
      };

      // Skip the precheck on edits where the drug name didn't change —
      // adjusting dosage or frequency can't introduce a new interaction.
      const drugNameChanged = !editingMedication ||
        editingMedication.drugName?.toLowerCase() !== medicationForm.drugName.toLowerCase();

      if (drugNameChanged && pet) {
        const otherDrugs = medications
          .filter((m) => m.id !== editingMedication?.id)
          .map((m) => ({ name: m.drugName }));
        const newDrug = { name: medicationForm.drugName };
        try {
          const checkResp = await api.post('/interactions/check', {
            drugs: [...otherDrugs, newDrug],
            species: pet.species,
            conditions: conditions.map((c) => c.name),
          });
          const result = checkResp.data?.data ?? checkResp.data;
          const interactions = (result?.interactions ?? []) as Array<{ severity?: string; [k: string]: any }>;
          const blocking = interactions.filter((i) =>
            ['high', 'major', 'medium', 'moderate'].includes((i.severity ?? '').toLowerCase())
          );
          if (blocking.length > 0) {
            setPendingMedication(medicationData);
            setInteractionWarnings(blocking);
            return;
          }
        } catch (precheckErr) {
          // Don't block the save on a precheck failure — log and continue.
          console.warn('Interaction precheck failed, proceeding without warning:', precheckErr);
        }
      }

      await persistMedication(medicationData);
    } catch (err: any) {
      console.error('Failed to save medication:', err);
      alert(err.response?.data?.message || 'Failed to save medication. Please try again.');
    }
  };

  const resetMedicationForm = () => {
    setMedicationForm({
      drugName: '',
      dosage: '',
      frequency: '',
      route: 'oral',
      startDate: new Date().toISOString().split('T')[0],
      prescribedBy: '',
      notes: '',
    });
    setShowMedicationForm(false);
    setEditingMedication(null);
  };

  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    setMedicationForm({
      drugName: medication.drugName,
      dosage: medication.dosage,
      frequency: medication.frequency,
      route: medication.route.toLowerCase(),
      startDate: medication.startDate,
      prescribedBy: medication.prescribedBy,
      notes: medication.notes || '',
    });
    setShowMedicationForm(true);
  };

  const handleDeleteMedication = async (medicationId: string) => {
    try {
      await api.delete(`/pets/${id}/medications/${medicationId}`);
      // Update local state
      const updatedMedications = medications.filter(m => m.id !== medicationId);
      setMedications(updatedMedications);
      setDeletingMedicationId(null);
    } catch (err: any) {
      console.error('Failed to delete medication:', err);
      alert(err.response?.data?.message || 'Failed to delete medication. Please try again.');
    }
  };

  const getSafetyScore = (): number => {
    // Simple safety score calculation
    let score = 100;
    if (medications.length > 3) score -= 10;
    if (conditions.some(c => c.severity === 'severe')) score -= 20;
    if (allergies.length > 2) score -= 15;
    return Math.max(0, score);
  };

  const getSeverityVariant = (severity: string): 'default' | 'success' | 'warning' | 'danger' => {
    switch (severity) {
      case 'severe':
        return 'danger';
      case 'moderate':
        return 'warning';
      case 'mild':
        return 'success';
      default:
        return 'default';
    }
  };

  const getSpeciesIcon = (species: string) => {
    switch (species.toLowerCase()) {
      case 'dog':
        return (
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 4c-1 0-2 .5-2.5 1L14 3.5c-.5-.5-1-.5-1.5 0L11 5c-.5-.5-1.5-1-2.5-1C6.5 4 5 5.5 5 7.5c0 1 .5 2 1 2.5l-1 1c-1 1-1 2.5 0 3.5l4 4c.5.5 1 .5 1.5.5s1 0 1.5-.5l7-7c1-1 1-2.5 0-3.5l-1-1c.5-.5 1-1.5 1-2.5C19 5.5 19.5 4 18 4z"/>
          </svg>
        );
      case 'cat':
        return (
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2c-4 0-7 3-7 7 0 2 1 4 2 5v6c0 1 1 2 2 2h6c1 0 2-1 2-2v-6c1-1 2-3 2-5 0-4-3-7-7-7zm-2 9c-.5 0-1-.5-1-1s.5-1 1-1 1 .5 1 1-.5 1-1 1zm4 0c-.5 0-1-.5-1-1s.5-1 1-1 1 .5 1 1-.5 1-1 1z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.5 11.5c0-1 .5-2 1.5-2.5 0-1.5 1-3 2.5-3.5C9 4 10.5 3 12 3s3 1 3.5 2.5c1.5.5 2.5 2 2.5 3.5 1 .5 1.5 1.5 1.5 2.5 0 1.5-1 3-2.5 3.5-.5 1.5-2 2.5-3.5 2.5v2H10.5v-2c-1.5 0-3-1-3.5-2.5C5.5 14.5 4.5 13 4.5 11.5z"/>
          </svg>
        );
    }
  };

  if (loading && !pet) {
    return <LoadingScreen message="Loading pet profile..." />;
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full animate-fade-up">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-display font-bold text-navy-900 dark:text-white mb-2">
              {error || 'Pet not found'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              We couldn't load this pet's profile. Please try again.
            </p>
            <Button onClick={() => navigate('/pets')}>
              Back to Pets
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const safetyScore = getSafetyScore();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950">
      {/* Print-only summary — visible only when the user hits Print. The
          rest of the app chrome is suppressed via `print:hidden` on the
          AppShell header / banners. */}
      <div className="hidden print:block p-8 text-black bg-white">
        <h1 className="text-3xl font-bold mb-1">PetCheck — Pet Record</h1>
        <p className="text-sm mb-6">Generated {new Date().toLocaleString()}</p>
        <h2 className="text-2xl font-bold mt-4 mb-2">{pet.name}</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6">
          <div><strong>Species:</strong> {pet.species}</div>
          <div><strong>Breed:</strong> {pet.breed}</div>
          <div><strong>Age:</strong> {pet.age} years</div>
          <div><strong>Weight:</strong> {pet.weight} lb</div>
          <div><strong>Birth date:</strong> {pet.birthDate || '—'}</div>
        </div>
        {pet.veterinarian?.clinicName && (
          <section className="mb-6">
            <h3 className="text-lg font-bold mb-1">Primary Vet</h3>
            <div className="text-sm">{pet.veterinarian.clinicName}</div>
            {pet.veterinarian.address && <div className="text-sm">{pet.veterinarian.address}</div>}
            {pet.veterinarian.phone && <div className="text-sm">{pet.veterinarian.phone}</div>}
          </section>
        )}
        <section className="mb-6">
          <h3 className="text-lg font-bold mb-1">Medications ({medications.length})</h3>
          {medications.length === 0 ? (
            <div className="text-sm">None on file.</div>
          ) : (
            <ul className="text-sm list-disc pl-5 space-y-1">
              {medications.map((m) => (
                <li key={m.id}>
                  <strong>{m.drugName}</strong> — {m.dosage}, {formatFrequency(m.frequency)}
                  {m.prescribedBy ? ` (Rx: ${m.prescribedBy})` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="mb-6">
          <h3 className="text-lg font-bold mb-1">Medical conditions ({conditions.length})</h3>
          {conditions.length === 0 ? (
            <div className="text-sm">None on file.</div>
          ) : (
            <ul className="text-sm list-disc pl-5 space-y-1">
              {conditions.map((c) => (<li key={c.id}><strong>{c.name}</strong>{c.severity ? ` — ${c.severity}` : ''}</li>))}
            </ul>
          )}
        </section>
        <section className="mb-6">
          <h3 className="text-lg font-bold mb-1">Allergies ({allergies.length})</h3>
          {allergies.length === 0 ? (
            <div className="text-sm">None on file.</div>
          ) : (
            <ul className="text-sm list-disc pl-5 space-y-1">
              {allergies.map((a) => (<li key={a.id}><strong>{a.allergen}</strong>{a.severity ? ` — ${a.severity}` : ''}</li>))}
            </ul>
          )}
        </section>
        <p className="text-xs mt-8 italic">PetCheck is for informational purposes only. Always consult your veterinarian.</p>
      </div>

      <div className="container mx-auto px-4 py-8 print:hidden">
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

        {/* Pet Header */}
        <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <div className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Pet Info */}
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/25 flex-shrink-0">
                  {getSpeciesIcon(pet.species)}
                </div>

                {/* Details */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-navy-900 dark:text-white mb-2">
                    {pet.name}
                  </h1>
                  <p className="text-xl text-slate-600 dark:text-slate-400 mb-3">
                    {pet.breed}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="primary" size="lg">{pet.species}</Badge>
                    <Badge variant="default" size="lg">{pet.age} years old</Badge>
                    <Badge variant="default" size="lg">{pet.weight} lbs</Badge>
                  </div>
                </div>
              </div>

              {/* Safety Score & Actions */}
              <div className="flex flex-col items-center sm:items-end gap-4">
                <SafetyIndicator score={safetyScore} size="lg" showLabel />
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" onClick={() => window.print()} aria-label="Print pet record">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </Button>
                  {!isGuest && <Button variant="outline" onClick={() => navigate(`/pets/${pet.id}/edit`)}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </Button>}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-100 dark:bg-navy-800 rounded-xl text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Birth Date</p>
                <p className="font-display font-semibold text-navy-900 dark:text-white">
                  {new Date(pet.birthDate).toLocaleDateString()}
                </p>
              </div>
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Medications</p>
                <p className="font-display font-bold text-2xl text-primary-600 dark:text-primary-400">
                  {medications.length}
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Conditions</p>
                <p className="font-display font-bold text-2xl text-amber-600 dark:text-amber-400">
                  {conditions.length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Primary Vet — set via "Save as primary vet" on the Find Vets page */}
        <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <div className="p-6 md:p-8">
            {pet.veterinarian?.clinicName ? (
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Primary Vet</div>
                  <h3 className="text-lg font-display font-bold text-navy-900 dark:text-white">{pet.veterinarian.clinicName}</h3>
                  {pet.veterinarian.address && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{pet.veterinarian.address}</p>
                  )}
                  {pet.veterinarian.phone && (
                    <a href={`tel:${pet.veterinarian.phone}`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block">
                      {pet.veterinarian.phone}
                    </a>
                  )}
                </div>
                {!isGuest && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/vets')}>Change</Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Primary Vet</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">No vet on file yet.</p>
                </div>
                {!isGuest && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/vets')}>Find a vet</Button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Current Medications */}
        <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-display font-bold text-navy-900 dark:text-white">
                  Current Medications
                </h2>
              </div>
              {!isGuest && <Button onClick={() => setShowMedicationForm(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Medication
              </Button>}
            </div>

            {/* Add/Edit Medication Form */}
            {showMedicationForm && (
              <Card variant="glass" className="mb-6 border-primary-200 dark:border-primary-800">
                <form onSubmit={handleSaveMedication} className="p-6">
                  <h3 className="text-lg font-display font-semibold text-navy-900 dark:text-white mb-4">
                    {editingMedication ? 'Edit Medication' : 'Add New Medication'}
                  </h3>

                  {/* Quick-add chips — only shown for new entries. Tap pre-fills
                      drug name + route + dosage + frequency; user adjusts after. */}
                  {!editingMedication && (
                    <div className="mb-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Common pet meds
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {MED_PRESETS.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() =>
                              setMedicationForm((prev) => ({
                                ...prev,
                                drugName: p.drugName,
                                route: p.route,
                                dosage: p.dosage,
                                frequency: p.frequency,
                                notes: p.notes ?? prev.notes,
                              }))
                            }
                            className="px-3 py-1.5 text-sm rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <Input
                      label="Drug Name"
                      type="text"
                      value={medicationForm.drugName}
                      onChange={(e) => setMedicationForm({ ...medicationForm, drugName: e.target.value })}
                      placeholder="Enter drug name"
                      required
                    />
                    <Input
                      label="Dosage"
                      type="text"
                      value={medicationForm.dosage}
                      onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })}
                      placeholder="e.g., 16mg, 1 tablet"
                      required
                    />
                    <Select
                      label="Frequency"
                      value={medicationForm.frequency}
                      onChange={(e) => setMedicationForm({ ...medicationForm, frequency: e.target.value })}
                      required
                    >
                      <option value="">Select frequency</option>
                      <option value="once_daily">Once daily</option>
                      <option value="twice_daily">Twice daily</option>
                      <option value="three_times_daily">Three times daily</option>
                      <option value="four_times_daily">Four times daily</option>
                      <option value="every_other_day">Every other day</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every two weeks</option>
                      <option value="monthly">Monthly</option>
                      <option value="as_needed">As needed</option>
                      <option value="custom">Custom</option>
                    </Select>
                    <Select
                      label="Route"
                      value={medicationForm.route}
                      onChange={(e) => setMedicationForm({ ...medicationForm, route: e.target.value })}
                      required
                    >
                      <option value="oral">Oral</option>
                      <option value="topical">Topical</option>
                      <option value="injectable">Injectable</option>
                      <option value="other">Other</option>
                    </Select>
                    <Input
                      label="Start Date"
                      type="date"
                      value={medicationForm.startDate}
                      onChange={(e) => setMedicationForm({ ...medicationForm, startDate: e.target.value })}
                      required
                    />
                    <Input
                      label="Prescribed By"
                      type="text"
                      value={medicationForm.prescribedBy}
                      onChange={(e) => setMedicationForm({ ...medicationForm, prescribedBy: e.target.value })}
                      placeholder="Veterinarian name"
                    />
                  </div>

                  <Input
                    label="Notes"
                    type="text"
                    value={medicationForm.notes}
                    onChange={(e) => setMedicationForm({ ...medicationForm, notes: e.target.value })}
                    placeholder="Additional notes about this medication"
                    className="mb-4"
                  />

                  <div className="flex gap-3">
                    <Button type="submit">
                      {editingMedication ? 'Update Medication' : 'Add Medication'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetMedicationForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Medications List */}
            {medications.length === 0 ? (
              <EmptyState
                title="No medications added yet"
                description="Add your pet's medications to track safety and interactions."
                action={!isGuest ? { label: 'Add Medication', onClick: () => setShowMedicationForm(true) } : undefined}
              />
            ) : (
              <div className="space-y-4">
                {medications.map((medication) => (
                  <div
                    key={medication.id}
                    className="p-4 bg-slate-50 dark:bg-navy-800/50 rounded-xl border border-slate-200 dark:border-navy-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-display font-semibold text-navy-900 dark:text-white">
                            {medication.drugName}
                          </h3>
                          <Badge variant="primary" size="sm">{medication.route}</Badge>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Dosage:</span>{' '}
                            <span className="font-medium text-navy-900 dark:text-white">{medication.dosage}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Frequency:</span>{' '}
                            <span className="font-medium text-navy-900 dark:text-white">{formatFrequency(medication.frequency)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Since:</span>{' '}
                            <span className="font-medium text-navy-900 dark:text-white">
                              {new Date(medication.startDate).toLocaleDateString()}
                            </span>
                          </div>
                          {medication.prescribedBy && (
                            <div className="sm:col-span-2 lg:col-span-3">
                              <span className="text-slate-500 dark:text-slate-400">Prescribed by:</span>{' '}
                              <span className="font-medium text-navy-900 dark:text-white">{medication.prescribedBy}</span>
                            </div>
                          )}
                        </div>
                        {medication.notes && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 italic">
                            {medication.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/drugs/search?q=${medication.drugName}`)}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Info
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMedication(medication)}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingMedicationId(medication.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Check Interactions Button */}
            {medications.length > 1 && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-navy-700">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const drugNames = medications.map(m => m.drugName).join(',');
                    navigate(`/interactions?drugs=${encodeURIComponent(drugNames)}&species=${pet.species}`);
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Check Drug Interactions
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Conditions & Allergies Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Medical Conditions */}
          <Card variant="elevated" className="animate-fade-up" style={{ animationDelay: '150ms' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-display font-bold text-navy-900 dark:text-white">
                  Medical Conditions
                </h2>
              </div>

              {conditions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400">No conditions recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((condition) => (
                    <div
                      key={condition.id}
                      className="p-4 bg-slate-50 dark:bg-navy-800/50 rounded-xl"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-navy-900 dark:text-white">
                          {condition.name}
                        </h3>
                        <Badge variant={getSeverityVariant(condition.severity)}>
                          {condition.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Diagnosed: {new Date(condition.diagnosedDate).toLocaleDateString()}
                      </p>
                      {condition.notes && (
                        <p className="text-sm text-slate-500 dark:text-slate-500 italic">
                          {condition.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Allergies */}
          <Card variant="elevated" className="animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-display font-bold text-navy-900 dark:text-white">
                  Known Allergies
                </h2>
              </div>

              {allergies.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400">No allergies recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allergies.map((allergy) => (
                    <div
                      key={allergy.id}
                      className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-navy-900 dark:text-white">
                          {allergy.allergen}
                        </h3>
                        <Badge variant={getSeverityVariant(allergy.severity)}>
                          {allergy.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Reaction:</span> {allergy.reaction}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Safety Summary */}
        <Card variant="elevated" className="animate-fade-up" style={{ animationDelay: '250ms' }}>
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-display font-bold text-navy-900 dark:text-white">
                Safety Summary
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-6 bg-gradient-to-br from-primary-50 to-teal-50 dark:from-primary-900/20 dark:to-teal-900/20 rounded-2xl">
                <SafetyIndicator score={safetyScore} size="lg" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Overall Safety Score</p>
              </div>
              <div className="text-center p-6 bg-slate-100 dark:bg-navy-800 rounded-2xl">
                <div className="text-4xl font-display font-bold text-navy-900 dark:text-white mb-1">
                  {medications.length}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Active Medications</p>
              </div>
              <div className="text-center p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl">
                <div className="text-4xl font-display font-bold text-amber-600 dark:text-amber-400 mb-1">
                  {allergies.length}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Known Allergies</p>
              </div>
            </div>

            <Alert variant="info">
              <p>
                <strong>Note:</strong> The safety score is based on the number of medications,
                severity of conditions, and known allergies. Always consult with your veterinarian
                for professional medical advice.
              </p>
            </Alert>
          </div>
        </Card>
      </div>

      {/* Delete Medication Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingMedicationId}
        onClose={() => setDeletingMedicationId(null)}
        onConfirm={() => deletingMedicationId && handleDeleteMedication(deletingMedicationId)}
        title="Remove Medication"
        message="Are you sure you want to remove this medication from the list? This action cannot be undone."
        confirmLabel="Remove"
        variant="danger"
      />

      {/* Interaction precheck dialog — flagged before save when this drug
          would interact with an existing medication. */}
      <ConfirmDialog
        isOpen={!!pendingMedication}
        onClose={() => { setPendingMedication(null); setInteractionWarnings([]); }}
        onConfirm={() => pendingMedication && persistMedication(pendingMedication)}
        title="Possible drug interaction"
        message={
          interactionWarnings.length === 0
            ? 'This medication may interact with another in your pet\'s list. Save anyway?'
            : `${interactionWarnings.length} interaction warning${interactionWarnings.length !== 1 ? 's' : ''} detected:\n\n` +
              interactionWarnings
                .slice(0, 3)
                .map((i) => {
                  const drugs = (i as any).drugs?.map((d: any) => d.name).join(' + ') ?? 'this drug';
                  const desc = (i as any).description ?? (i as any).message ?? 'See details';
                  return `• [${(i.severity ?? 'unknown').toUpperCase()}] ${drugs}: ${desc}`;
                })
                .join('\n')
        }
        confirmLabel="Save anyway"
        cancelLabel="Cancel"
        variant="warning"
      />
    </div>
  );
};
