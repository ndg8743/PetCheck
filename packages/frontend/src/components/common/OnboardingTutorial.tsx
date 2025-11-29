import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    path: string;
  };
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to PetCheck!',
    description: 'Your trusted companion for pet medication safety. Let us show you around.',
    icon: (
      <svg className="w-16 h-16 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    title: 'Add Your Pets',
    description: 'Start by adding your pets to track their medications and get personalized safety alerts.',
    icon: (
      <svg className="w-16 h-16 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    action: {
      label: 'Add a Pet',
      path: '/pets/new',
    },
  },
  {
    title: 'Search Drug Safety',
    description: 'Look up any veterinary medication to check for adverse events, recalls, and safety information.',
    icon: (
      <svg className="w-16 h-16 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    action: {
      label: 'Search Drugs',
      path: '/drugs',
    },
  },
  {
    title: 'Check Drug Interactions',
    description: 'Before giving multiple medications, check for potential interactions to keep your pet safe.',
    icon: (
      <svg className="w-16 h-16 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    action: {
      label: 'Check Interactions',
      path: '/interactions',
    },
  },
  {
    title: 'Stay Informed on Recalls',
    description: 'Get notified about FDA recalls affecting veterinary medications your pets may be taking.',
    icon: (
      <svg className="w-16 h-16 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    action: {
      label: 'View Recalls',
      path: '/recalls',
    },
  },
  {
    title: 'Find Nearby Vets',
    description: 'Locate veterinarians and emergency animal hospitals near you when you need them most.',
    icon: (
      <svg className="w-16 h-16 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    action: {
      label: 'Find Vets',
      path: '/vets',
    },
  },
  {
    title: "You're All Set!",
    description: "You're ready to start keeping your pets safe. Access all features from the menu anytime.",
    icon: (
      <svg className="w-16 h-16 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    action: {
      label: 'Go to Dashboard',
      path: '/dashboard',
    },
  },
];

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleAction = () => {
    if (step.action) {
      onComplete();
      navigate(step.action.path);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-navy-800 shadow-2xl transition-all animate-fade-up">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>

          {/* Skip button */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Skip tutorial
            </button>
          )}

          {/* Content */}
          <div className="p-8 pt-12 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-gray-50 dark:bg-navy-700">
                {step.icon}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-3 font-display">
              {step.title}
            </h2>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto">
              {step.description}
            </p>

            {/* Step indicators */}
            <div className="flex justify-center gap-2 mb-8">
              {tutorialSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-6 bg-primary-500'
                      : index < currentStep
                      ? 'bg-primary-300 dark:bg-primary-700'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="order-2 sm:order-1"
                >
                  Previous
                </Button>
              )}

              {step.action && !isLastStep && (
                <Button
                  variant="secondary"
                  onClick={handleAction}
                  className="order-1 sm:order-2"
                >
                  {step.action.label}
                </Button>
              )}

              <Button
                onClick={handleNext}
                className="order-1 sm:order-3"
              >
                {isLastStep ? 'Get Started' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to manage tutorial state
export const useTutorial = () => {
  const TUTORIAL_KEY = 'petcheck_tutorial_completed';

  const [showTutorial, setShowTutorial] = useState(false);

  const checkTutorialStatus = () => {
    const completed = localStorage.getItem(TUTORIAL_KEY);
    return completed === 'true';
  };

  const startTutorial = () => {
    setShowTutorial(true);
  };

  const completeTutorial = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem(TUTORIAL_KEY);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  // Check if user is new and should see tutorial
  const shouldShowTutorial = () => {
    return !checkTutorialStatus();
  };

  return {
    showTutorial,
    startTutorial,
    completeTutorial,
    resetTutorial,
    closeTutorial,
    shouldShowTutorial,
    isTutorialCompleted: checkTutorialStatus,
  };
};
