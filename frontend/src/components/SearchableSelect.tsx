import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string;
  badge?: string;
  badgeTone?: 'amber' | 'slate' | 'emerald' | 'blue';
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  emptySearchMessage?: string;
  disabled?: boolean;
  compact?: boolean;
  clearable?: boolean;
  clearLabel?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options available.',
  emptySearchMessage,
  disabled = false,
  compact = false,
  clearable = false,
  clearLabel = 'Clear',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const idPrefix = useId();

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      return;
    }

    searchInputRef.current?.focus();

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filteredOptions = useMemo(
    () => options.filter((option) => {
      const haystack = `${option.label} ${option.searchText || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    }),
    [normalizedQuery, options],
  );

  const resolvedEmptySearchMessage = emptySearchMessage || `No options match "${searchTerm}".`;

  const badgeClasses: Record<NonNullable<SearchableSelectOption['badgeTone']>, string> = {
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((open) => !open)}
        className={`w-full rounded-lg border px-3 text-left shadow-sm transition ${
          isOpen
            ? 'border-blue-300 bg-blue-50/60 ring-2 ring-blue-100'
            : 'border-slate-200 bg-white hover:border-slate-300'
        } ${compact ? 'py-1.5' : 'py-2'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className={`${compact ? 'text-xs' : 'text-sm'} truncate font-semibold text-slate-800`}>
              {selectedOption ? selectedOption.label : placeholder}
            </div>
          </div>
          {selectedOption?.badge ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClasses[selectedOption.badgeTone || 'slate']}`}
            >
              {selectedOption.badge}
            </span>
          ) : null}
          <ChevronDown
            size={16}
            className={`mt-0.5 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className={`border-b border-slate-100 ${compact ? 'p-2.5' : 'p-3'}`}>
            <div className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 ${compact ? 'py-1.5' : 'py-2'} focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100`}>
              <Search size={14} className="text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className={`max-h-64 space-y-1 overflow-y-auto ${compact ? 'p-1.5' : 'p-2'}`}>
            {options.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                {emptyMessage}
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const optionId = `${idPrefix}-${option.value || 'empty'}`;
                const isSelected = option.value === value;

                return (
                  <button
                    key={optionId}
                    type="button"
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 text-left transition ${
                      isSelected
                        ? 'border-blue-200 bg-blue-50'
                        : option.disabled
                          ? 'cursor-not-allowed border-transparent bg-slate-50/80 text-slate-400'
                          : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                    } ${compact ? 'py-1.5' : 'py-2.5'}`}
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <div className={`${compact ? 'text-xs' : 'text-sm'} truncate font-medium text-slate-800`}>
                        {option.label}
                      </div>
                      {option.badge ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClasses[option.badgeTone || 'slate']}`}
                        >
                          {option.badge}
                        </span>
                      ) : null}
                    </div>
                    {isSelected ? (
                      <Check size={14} className="shrink-0 text-blue-700" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                {resolvedEmptySearchMessage}
              </div>
            )}
          </div>

          {clearable ? (
            <div className={`flex justify-end border-t border-slate-100 bg-slate-50 px-3 ${compact ? 'py-1.5' : 'py-2'}`}>
              <button
                type="button"
                onClick={handleClear}
                disabled={!value}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearLabel}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
