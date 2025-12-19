import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ onSearch, placeholder = 'Search...', className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimerRef = useRef(null);
  const isFirstRender = useRef(true);
  const onSearchRef = useRef(onSearch);

  // Keep the onSearch callback reference up to date
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Debounce search - call onSearch after user stops typing
  useEffect(() => {
    // Skip the first render to avoid calling onSearch on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      onSearchRef.current(searchTerm);
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        value={searchTerm}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
      {searchTerm && (
        <button
          onClick={handleClear}
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;