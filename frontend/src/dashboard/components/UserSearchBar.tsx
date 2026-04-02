import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface UserSearchBarProps {
  onSearch: (value: string) => void;
  isLoading: boolean;
}

const UserSearchBar: React.FC<UserSearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  // Local effect for debouncing search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim()) {
        onSearch(query);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div className="relative group w-full">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
        placeholder="Search performance by Name or Email..."
      />
      {isLoading && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default UserSearchBar;
