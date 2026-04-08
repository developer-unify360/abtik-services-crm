import React, { useEffect, useRef, useState } from 'react';
import { Search, User as UserIcon, X } from 'lucide-react';
import apiClient from '../../api/apiClient';

interface UserSuggestion {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserSearchBarProps {
  onSearch: (userId: string, userName: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  initialValue?: string;
  placeholder?: string;
  compact?: boolean;
}

const UserSearchBar: React.FC<UserSearchBarProps> = ({
  onSearch,
  onClear,
  isLoading = false,
  initialValue = '',
  placeholder = 'Search user performance...',
  compact = false,
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const syncedValueRef = useRef(initialValue);

  useEffect(() => {
    syncedValueRef.current = initialValue;
    setQuery(initialValue);
    if (!initialValue.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [initialValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      if (trimmedQuery === syncedValueRef.current.trim()) {
        return;
      }

      setIsFetching(true);
      try {
        const res = await apiClient.get(`/users/public/?search=${encodeURIComponent(trimmedQuery)}`);
        setSuggestions(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error('Failed to fetch user suggestions:', err);
      } finally {
        setIsFetching(false);
      }
    };

    const handler = window.setTimeout(fetchSuggestions, 250);
    return () => window.clearTimeout(handler);
  }, [query]);

  const handleSelect = (user: UserSuggestion) => {
    syncedValueRef.current = user.name;
    setQuery(user.name);
    setShowDropdown(false);
    onSearch(user.id, user.name);
  };

  const handleClear = () => {
    syncedValueRef.current = '';
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onClear?.();
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      syncedValueRef.current = '';
      setSuggestions([]);
      setShowDropdown(false);
      onClear?.();
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className={`absolute inset-y-0 left-0 flex items-center pointer-events-none ${compact ? 'pl-3' : 'pl-4'}`}>
        <Search className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-slate-400`} />
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (query.trim() && suggestions.length > 0) {
            setShowDropdown(true);
          }
        }}
        className={`block w-full border border-slate-200 bg-white text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 ${
          compact ? 'h-10 rounded-lg pl-9 pr-9 text-sm' : 'rounded-xl py-2.5 pl-10 pr-10 text-sm'
        }`}
        placeholder={placeholder}
      />

      {(isLoading || isFetching) && (
        <div className={`absolute inset-y-0 right-0 flex items-center ${compact ? 'pr-3' : 'pr-4'}`}>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {!isLoading && !isFetching && query.trim().length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className={`absolute inset-y-0 right-0 flex items-center text-slate-400 transition-colors hover:text-slate-600 ${compact ? 'pr-3' : 'pr-4'}`}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <UserIcon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {user.role.replace('_', ' ')} | {user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500">No users found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearchBar;
