import React, { useState, useEffect, useRef } from 'react';
import { Search, User as UserIcon } from 'lucide-react';
import apiClient from '../../api/apiClient';

interface UserSuggestion {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserSearchBarProps {
  onSearch: (userId: string) => void;
  isLoading: boolean;
}

const UserSearchBar: React.FC<UserSearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length === 0) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsFetching(true);
      try {
        const res = await apiClient.get(`/users/public/?search=${encodeURIComponent(query)}`);
        setSuggestions(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error('Failed to fetch user suggestions:', err);
      } finally {
        setIsFetching(false);
      }
    };

    const handler = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const handleSelect = (user: UserSuggestion) => {
    setQuery(user.name);
    setShowDropdown(false);
    onSearch(user.id);
  };

  return (
    <div className="relative group w-full" ref={dropdownRef}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length > 0 && setShowDropdown(true)}
        className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
        placeholder="Search performance by Name or Email..."
      />
      
      {/* Loading Spinners */}
      {(isLoading || isFetching) && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Suggestion Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors group/item"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover/item:bg-indigo-100 transition-colors">
                    <UserIcon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{user.name}</p>
                    <p className="text-[9px] text-slate-400 font-medium truncate uppercase tracking-tighter">{user.role.replace('_', ' ')} • {user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase">No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearchBar;

