import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ onSearch, placeholder = 'Search...', className = '', value: controlledValue }) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState(controlledValue || '');
  const isControlled = controlledValue !== undefined;
  const searchTerm = isControlled ? controlledValue : internalSearchTerm;
  const debounceTimerRef = useRef(null);

  // Sync internal state with controlled value (only for display, NEVER trigger onSearch)
  // For controlled components, we NEVER call onSearch from useEffect - only from user actions
  useEffect(() => {
    if (isControlled && controlledValue !== internalSearchTerm) {
      setInternalSearchTerm(controlledValue);
    }
  }, [controlledValue, isControlled, internalSearchTerm]);

  // For uncontrolled component only: debounce and call onSearch when internal state changes
  useEffect(() => {
    if (!isControlled) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        onSearch(internalSearchTerm);
      }, 500);

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }
    // For controlled components, we do NOT call onSearch here - only from user actions (handleChange/handleClear)
  }, [internalSearchTerm, isControlled, onSearch]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    if (!isControlled) {
      setInternalSearchTerm(newValue);
    } else {
      // For controlled components: debounce onSearch when user types
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        onSearch(newValue);
      }, 500);
    }
  };

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (isControlled) {
      onSearch('');
    } else {
      setInternalSearchTerm('');
    }
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