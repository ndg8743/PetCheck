import React from 'react';

export interface Species {
  id: string;
  name: string;
  icon?: React.ReactNode;
  emoji?: string;
}

export interface SpeciesSelectorProps {
  species?: Species[];
  selectedSpecies: string[];
  onChange: (selectedIds: string[]) => void;
  mode?: 'single' | 'multiple';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'card' | 'minimal';
  label?: string;
  showLabel?: boolean;
}

// Species icons as SVGs
const speciesIcons: Record<string, React.ReactNode> = {
  dog: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M18 4c-1 0-2 .5-3 2-1-1-2-2-4-2s-3 1-4 2c-1-1.5-2-2-3-2-2 0-3 2-3 4 0 3 2 6 4 8l2 2v2c0 1 1 2 2 2h4c1 0 2-1 2-2v-2l2-2c2-2 4-5 4-8 0-2-1-4-3-4zm-9 11c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2zm6 0c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z" />
    </svg>
  ),
  cat: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12 2C9 2 6 4 6 7c0 1.5.5 2.5 1 3.5C6 11 5 12 5 14c0 3 2 6 7 8 5-2 7-5 7-8 0-2-1-3-2-3.5.5-1 1-2 1-3.5 0-3-3-5-6-5zm-3 11c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2zm6 0c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2zm-3 4c-1 0-2-.5-2-1h4c0 .5-1 1-2 1z" />
    </svg>
  ),
  horse: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M20 8V6l-2-2-3 1-3-2H8L5 6v2l-1 4c0 2 1 4 3 5v3c0 1 1 2 2 2h2c1 0 2-1 2-2v-1h2v1c0 1 1 2 2 2h2c1 0 2-1 2-2v-3c2-1 3-3 3-5l-1-4zm-11 4c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z" />
    </svg>
  ),
  cattle: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M11 3L9 1H4l2 4H4l-2 4c0 3 2 5 4 6v5c0 1 1 2 2 2h2c1 0 2-1 2-2v-2h2v2c0 1 1 2 2 2h2c1 0 2-1 2-2v-5c2-1 4-3 4-6l-2-4h-2l2-4h-5l-2 2h-2zm-2 9c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2zm6 0c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z" />
    </svg>
  ),
  swine: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M20 10c0-1-.5-2-1-3l1-3h-2l-1 2c-1-.5-2-1-3-1V3h-4v2c-1 0-2 .5-3 1L6 4H4l1 3c-.5 1-1 2-1 3l-2 2c0 2 1 3 2 4v4c0 1 1 2 2 2h2c1 0 2-1 2-2v-1h4v1c0 1 1 2 2 2h2c1 0 2-1 2-2v-4c1-1 2-2 2-4l-2-2zm-11 2c-1 0-1.5-.5-1.5-1.5S8 9 9 9s1.5.5 1.5 1.5S10 12 9 12zm4 4h-2v-2h2v2zm2-4c-1 0-1.5-.5-1.5-1.5S14 9 15 9s1.5.5 1.5 1.5-.5 1.5-1.5 1.5z" />
    </svg>
  ),
  poultry: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M19 9l-1-4c-.5-1-1.5-2-3-2h-2l-1 2-1-2H9c-1.5 0-2.5 1-3 2L5 9c-1 .5-2 1.5-2 3 0 2 1.5 3.5 3 4l1 4c.5 1 1.5 2 3 2h4c1.5 0 2.5-1 3-2l1-4c1.5-.5 3-2 3-4 0-1.5-1-2.5-2-3zm-10 3c-1 0-1.5-.5-1.5-1.5S8 9 9 9s1.5.5 1.5 1.5S10 12 9 12z" />
    </svg>
  ),
};

const defaultSpecies: Species[] = [
  { id: 'dog', name: 'Dogs', icon: speciesIcons.dog },
  { id: 'cat', name: 'Cats', icon: speciesIcons.cat },
  { id: 'horse', name: 'Horses', icon: speciesIcons.horse },
  { id: 'cattle', name: 'Cattle', icon: speciesIcons.cattle },
  { id: 'swine', name: 'Swine', icon: speciesIcons.swine },
  { id: 'poultry', name: 'Poultry', icon: speciesIcons.poultry },
];

export const SpeciesSelector: React.FC<SpeciesSelectorProps> = ({
  species = defaultSpecies,
  selectedSpecies = [],
  onChange,
  mode = 'multiple',
  className = '',
  size = 'md',
  variant = 'pill',
  label = 'Select Species',
  showLabel = true,
}) => {
  const handleToggle = (speciesId: string) => {
    if (mode === 'single') {
      onChange([speciesId]);
    } else {
      const isSelected = selectedSpecies.includes(speciesId);
      if (isSelected) {
        onChange(selectedSpecies.filter((id) => id !== speciesId));
      } else {
        onChange([...selectedSpecies, speciesId]);
      }
    }
  };

  const sizeConfig = {
    sm: {
      pill: 'px-3 py-1.5 text-xs',
      card: 'p-3',
      minimal: 'px-2 py-1 text-xs',
      icon: 'w-4 h-4',
      cardIcon: 'w-6 h-6',
    },
    md: {
      pill: 'px-4 py-2 text-sm',
      card: 'p-4',
      minimal: 'px-3 py-1.5 text-sm',
      icon: 'w-5 h-5',
      cardIcon: 'w-8 h-8',
    },
    lg: {
      pill: 'px-5 py-2.5 text-base',
      card: 'p-5',
      minimal: 'px-4 py-2 text-base',
      icon: 'w-6 h-6',
      cardIcon: 'w-10 h-10',
    },
  };

  const sizes = sizeConfig[size];

  // Minimal variant - simple text pills
  if (variant === 'minimal') {
    return (
      <div className={className}>
        {showLabel && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          {species.map((sp) => {
            const isSelected = selectedSpecies.includes(sp.id);
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => handleToggle(sp.id)}
                className={`
                  ${sizes.minimal}
                  rounded-full font-medium
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  dark:focus:ring-offset-navy-900
                  ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
                aria-pressed={isSelected}
              >
                {sp.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Card variant - large cards with icons
  if (variant === 'card') {
    return (
      <div className={className}>
        {showLabel && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {label}
          </label>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {species.map((sp) => {
            const isSelected = selectedSpecies.includes(sp.id);
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => handleToggle(sp.id)}
                className={`
                  flex flex-col items-center justify-center ${sizes.card}
                  rounded-xl
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  dark:focus:ring-offset-navy-900
                  ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-900/30 border-2 border-primary-500 shadow-sm'
                      : 'bg-white dark:bg-navy-800 border-2 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                  }
                `}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} ${sp.name}`}
              >
                {sp.icon && (
                  <div
                    className={`
                      ${sizes.cardIcon} mb-2
                      ${
                        isSelected
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }
                      transition-colors
                    `}
                  >
                    {sp.icon}
                  </div>
                )}
                {sp.emoji && (
                  <span className="text-2xl mb-2" aria-hidden="true">
                    {sp.emoji}
                  </span>
                )}
                <span
                  className={`
                    text-sm font-medium
                    ${
                      isSelected
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {sp.name}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <svg
                      className="w-4 h-4 text-primary-600 dark:text-primary-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default pill variant
  return (
    <div className={className}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {species.map((sp) => {
          const isSelected = selectedSpecies.includes(sp.id);
          return (
            <button
              key={sp.id}
              type="button"
              onClick={() => handleToggle(sp.id)}
              className={`
                inline-flex items-center gap-2 ${sizes.pill}
                rounded-full font-medium
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                dark:focus:ring-offset-navy-900
                ${
                  isSelected
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border-2 border-primary-400 dark:border-primary-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${sp.name}`}
            >
              {sp.icon && (
                <span
                  className={`
                    ${sizes.icon}
                    ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}
                  `}
                >
                  {sp.icon}
                </span>
              )}
              {sp.emoji && (
                <span className="text-base" aria-hidden="true">
                  {sp.emoji}
                </span>
              )}
              <span>{sp.name}</span>
              {isSelected && (
                <svg
                  className="w-4 h-4 text-primary-600 dark:text-primary-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Compact single species display
export interface SpeciesDisplayProps {
  speciesId: string;
  speciesName?: string;
  className?: string;
}

export const SpeciesDisplay: React.FC<SpeciesDisplayProps> = ({
  speciesId,
  speciesName,
  className = '',
}) => {
  const icon = speciesIcons[speciesId];
  const name = speciesName || defaultSpecies.find((s) => s.id === speciesId)?.name || speciesId;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {icon && <span className="w-4 h-4 text-gray-500 dark:text-gray-400">{icon}</span>}
      <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
    </div>
  );
};
