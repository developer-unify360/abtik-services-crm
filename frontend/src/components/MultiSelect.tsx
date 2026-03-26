import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options available.',
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

  const selectedOptions = value
    .map((selectedValue) => options.find((option) => option.value === selectedValue))
    .filter((option): option is MultiSelectOption => Boolean(option));

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const matchingOptions = options.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery),
  );
  const filteredOptions = [
    ...matchingOptions.filter((option) => value.includes(option.value)),
    ...matchingOptions.filter((option) => !value.includes(option.value)),
  ];
  const hasAvailableOptions = options.length > 0;
  const allVisibleSelected = filteredOptions.length > 0
    && filteredOptions.every((option) => value.includes(option.value));

  const toggleValue = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((selectedValue) => selectedValue !== optionValue));
      return;
    }

    onChange([...value, optionValue]);
  };

  const selectVisibleOptions = () => {
    if (filteredOptions.length === 0) {
      return;
    }

    const mergedValues = Array.from(
      new Set([...value, ...filteredOptions.map((option) => option.value)]),
    );
    onChange(mergedValues);
  };

  const clearSelection = () => onChange([]);

  return (
    <div className="space-y-1" ref={containerRef}>
      <button
        type="button"
        onClick={() => hasAvailableOptions && setIsOpen((open) => !open)}
        className={`w-full rounded-xl border px-3 py-2.5 text-left shadow-sm transition ${
          isOpen
            ? 'border-blue-300 bg-blue-50/60 ring-2 ring-blue-100'
            : 'border-slate-200 bg-white hover:border-slate-300'
        } ${!hasAvailableOptions ? 'cursor-not-allowed opacity-60' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={!hasAvailableOptions}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-800">
              {selectedOptions.length > 0
                ? `${selectedOptions.length} service${selectedOptions.length === 1 ? '' : 's'} selected`
                : placeholder}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {selectedOptions.length > 0
                ? selectedOptions.map((option) => option.label).join(', ')
                : 'Choose one or more services from a searchable list.'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {selectedOptions.length}
            </span>
            <ChevronDown
              size={16}
              className={`mt-0.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      {isOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
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

          <div className="max-h-64 space-y-1 overflow-y-auto p-2">
            {!hasAvailableOptions ? (
              <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                {emptyMessage}
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const optionId = `${idPrefix}-${option.value}`;
                const isSelected = value.includes(option.value);

                return (
                  <label
                    key={option.value}
                    htmlFor={optionId}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                      isSelected
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      id={optionId}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleValue(option.value)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">{option.label}</div>
                    </div>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                        <Check size={12} />
                        Selected
                      </span>
                    ) : null}
                  </label>
                );
              })
            ) : (
              <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                No services match "{searchTerm}".
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5">
            <span className="text-xs text-slate-500">
              {selectedOptions.length > 0
                ? `${selectedOptions.length} service${selectedOptions.length === 1 ? '' : 's'} ready for this booking`
                : 'No services selected yet'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectVisibleOptions}
                disabled={!hasAvailableOptions || filteredOptions.length === 0 || allVisibleSelected}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select visible
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectedOptions.length === 0}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5">
        {selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {option.label}
                <button
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className="rounded-full p-0.5 text-blue-600 transition hover:bg-blue-100 hover:text-blue-800"
                  aria-label={`Remove ${option.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            Search and select multiple services. Your selections will appear here as removable tags.
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;
