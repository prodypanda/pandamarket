'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '../../contexts/LocaleContext';

interface SearchResult {
  id: string;
  title: string;
  price: number;
  category?: string;
}

export function SearchBar() {
  const router = useRouter();
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    setShowDropdown(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/pd/search/suggest?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.suggestions || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(val);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      setShowDropdown(false);
      router.push(`/hub/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 1 && setShowDropdown(true)}
          placeholder={t('common.search')}
          className="w-full px-5 py-3 pl-12 text-gray-900 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#16C784] shadow-sm transition-shadow"
        />
        <Search className="absolute left-4 w-5 h-5 text-gray-400" />
      </div>

      {showDropdown && query.length > 1 && (
        <div className="absolute w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-gray-500">{t('common.loading')}</div>
          ) : results.length > 0 ? (
            <>
              <ul className="divide-y divide-gray-50">
                {results.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/hub/products/${r.id}`}
                      onClick={() => setShowDropdown(false)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center block"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.title}</p>
                        {r.category && <p className="text-xs text-gray-500">{r.category}</p>}
                      </div>
                      <span className="text-sm font-bold text-[#16C784]">
                        {r.price.toFixed(3)} {t('common.currency')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/hub/search?q=${encodeURIComponent(query)}`}
                onClick={() => setShowDropdown(false)}
                className="block p-3 text-center text-sm font-medium text-[#16C784] hover:bg-gray-50 border-t border-gray-100"
              >
                {t('common.seeAll')} →
              </Link>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">{t('common.noResults')}</div>
          )}
        </div>
      )}
    </div>
  );
}
