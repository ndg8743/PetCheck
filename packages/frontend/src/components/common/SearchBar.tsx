import React, { useState, useRef, useEffect } from 'react';

export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'hero';
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search for drugs or medications...',
  onSearch,
  isLoading = false,
  className = '',
  size = 'md',
  variant = 'default',
  suggestions = [],
  onSuggestionSelect,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    } else {
      onSearch(suggestion);
    }
  };

  const sizeClasses = {
    sm: {
      input: 'pl-10 pr-12 py-2.5 text-sm',
      icon: 'h-4 w-4',
      iconLeft: 'pl-3',
      iconRight: 'pr-3',
    },
    md: {
      input: 'pl-12 pr-14 py-3.5 text-base',
      icon: 'h-5 w-5',
      iconLeft: 'pl-4',
      iconRight: 'pr-4',
    },
    lg: {
      input: 'pl-14 pr-16 py-4.5 text-lg',
      icon: 'h-6 w-6',
      iconLeft: 'pl-5',
      iconRight: 'pr-5',
    },
  };

  const sizes = sizeClasses[size];

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(query.toLowerCase()) && query.length > 0
  );

  const isHero = variant === 'hero';

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`} ref={wrapperRef}>
      <div className="relative group">
        {/* Gradient border effect for hero variant */}
        {isHero && (
          <div
            className={`
              absolute -inset-0.5 rounded-2xl
              bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500
              opacity-0 blur-sm transition-opacity duration-500
              ${isFocused ? 'opacity-75' : 'group-hover:opacity-50'}
            `}
            aria-hidden="true"
          />
        )}

        {/* Input wrapper */}
        <div
          className={`
            relative rounded-xl overflow-hidden
            ${isHero ? 'shadow-elevated' : 'shadow-card'}
            transition-shadow duration-300
            ${isFocused && !isHero ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-navy-900' : ''}
          `}
        >
          {/* Search icon */}
          <div
            className={`absolute inset-y-0 left-0 ${sizes.iconLeft} flex items-center pointer-events-none`}
          >
            <svg
              className={`${sizes.icon} text-gray-400 dark:text-gray-500 transition-colors ${
                isFocused ? 'text-primary-500 dark:text-primary-400' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => setIsFocused(false)}
            className={`
              block w-full ${sizes.input}
              bg-white dark:bg-navy-800
              border-0
              text-navy-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none
              font-body
              ${isHero ? 'rounded-xl' : 'rounded-xl'}
            `}
            placeholder={placeholder}
            aria-label="Search for drugs or medications"
            autoComplete="off"
          />

          {/* Right side - search button */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className={`
                flex items-center justify-center gap-2
                ${size === 'lg' ? 'px-5 py-2.5 text-base' : size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-sm'}
                bg-primary-600 hover:bg-primary-700
                text-white font-medium
                rounded-lg
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                dark:focus:ring-offset-navy-800
                transition-all duration-200
                shadow-sm hover:shadow-md
              `}
              aria-label="Search"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            className="
              absolute z-20 w-full mt-2
              bg-white dark:bg-navy-800
              rounded-xl shadow-elevated
              border border-gray-200 dark:border-gray-700
              overflow-hidden
              animate-fade-up
            "
          >
            <ul className="py-2 max-h-64 overflow-y-auto">
              {filteredSuggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="
                      w-full px-4 py-2.5 text-left
                      text-sm text-navy-900 dark:text-gray-100
                      hover:bg-gray-50 dark:hover:bg-gray-700/50
                      focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700/50
                      transition-colors
                      flex items-center gap-3
                    "
                  >
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Popular searches hint for hero variant */}
      {isHero && suggestions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">Popular:</span>
          {suggestions.slice(0, 4).map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </form>
  );
};
