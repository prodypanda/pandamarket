'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  price: number;
  category: string;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.trim().length > 1) {
      setIsSearching(true);
      try {
        // In a real application, replace this with an actual API call to our backend:
        // const res = await fetch(`/api/pd/search?q=${encodeURIComponent(val)}`);
        // const data = await res.json();
        // setResults(data.hits);
        
        // Mock data for demonstration
        setTimeout(() => {
          setResults([
            { id: '1', title: `${val} Product 1`, price: 99, category: 'Electronics' },
            { id: '2', title: `${val} Product 2`, price: 45, category: 'Fashion' },
          ]);
          setIsSearching(false);
        }, 300);
      } catch (err) {
        setIsSearching(false);
      }
    } else {
      setResults([]);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          placeholder="Search for products across all stores..."
          className="w-full px-5 py-3 pl-12 text-gray-900 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-shadow"
        />
        <Search className="absolute left-4 w-5 h-5 text-gray-400" />
      </div>

      {query.length > 1 && (
        <div className="absolute w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {results.map((r) => (
                <li key={r.id} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.category}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600">TND {r.price}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">No products found</div>
          )}
        </div>
      )}
    </div>
  );
}
