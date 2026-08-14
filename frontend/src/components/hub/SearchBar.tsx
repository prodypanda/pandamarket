'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '../../contexts/LocaleContext';
import { getHubProductHref } from '../../lib/product-links';
import { isAliExpressTheme } from '../../lib/marketplace-theme';

interface SearchResult {
  id: string;
  title: string;
  price: number | string;
  slug?: string | null;
  category?: string;
  marketplace_category_slug?: string | null;
  store_subdomain?: string | null;
}

interface SearchBarProps {
  marketplaceTheme?: 'panda' | 'aliexpress' | 'aliexpress2';
}

function formatResultPrice(price: SearchResult['price'], currency: string) {
  const amount = Number(price);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} ${currency}`;
}

export function SearchBar({ marketplaceTheme = 'panda' }: SearchBarProps) {
  const router = useRouter();
  const { t } = useLocale();
  const isAliExpress = isAliExpressTheme(marketplaceTheme);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setResults([]);
      setShowDropdown(false);
      setActiveIndex(-1);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentSeq = ++requestSeqRef.current;

    setIsSearching(true);
    setShowDropdown(true);
    setActiveIndex(-1);

    try {
      const res = await fetch(`/api/pd/search/suggest?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (currentSeq !== requestSeqRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (currentSeq === requestSeqRef.current) {
          setResults(data.suggestions || []);
        }
      } else {
        if (currentSeq === requestSeqRef.current) setResults([]);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError' && currentSeq === requestSeqRef.current) {
        setResults([]);
      }
    } finally {
      if (currentSeq === requestSeqRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(val);
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showDropdown && query.length > 1) {
        setShowDropdown(true);
      }
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      setActiveIndex(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setShowDropdown(false);
      if (activeIndex >= 0 && results[activeIndex]) {
        router.push(getHubProductHref(results[activeIndex]));
      } else if (query.trim()) {
        router.push(`/hub/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const activeOptionId = activeIndex >= 0 && results[activeIndex] ? `suggestion-${results[activeIndex].id}` : undefined;

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={wrapperRef}>
      <div className={`relative flex items-center ${isAliExpress ? 'rounded-full bg-white p-1 shadow-lg shadow-orange-900/10 ring-2 ring-[#ff4747]' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown && query.length > 1}
          aria-controls="hub-search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label={t('common.search')}
          value={query}
          onChange={handleSearch}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 1 && setShowDropdown(true)}
          placeholder={t('common.search')}
          className={`w-full px-5 py-3.5 ps-12 text-gray-900 bg-white rounded-full focus:outline-none transition-all ${
            isAliExpress ? 'border-0 pe-28 shadow-none focus:ring-0' : 'border border-gray-200 focus:border-[#16C784] focus:ring-4 focus:ring-[#16C784]/15 shadow-sm'
          }`}
        />
        <Search className="absolute start-4 w-5 h-5 text-gray-400" />
        {isAliExpress && (
          <button
            type="button"
            onClick={() => {
              if (query.trim()) router.push(`/hub/search?q=${encodeURIComponent(query.trim())}`);
            }}
            className="absolute end-1.5 rounded-full bg-gradient-to-r from-[#ff4747] to-[#ff8a00] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-900/20 transition hover:scale-[1.02]"
          >
            Search
          </button>
        )}
      </div>

      {showDropdown && query.length > 1 && (
        <div
          id="hub-search-suggestions"
          role="listbox"
          aria-label="Suggestions de recherche"
          className="absolute w-full mt-3 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-slate-900/10 z-50 overflow-hidden"
        >
          {isSearching ? (
            <div className="p-4 text-center text-sm text-gray-500" role="status">{t('common.loading')}</div>
          ) : results.length > 0 ? (
            <>
              <ul className="divide-y divide-gray-50">
                {results.map((r, index) => {
                  const isSelected = index === activeIndex;
                  return (
                    <li
                      key={r.id}
                      id={`suggestion-${r.id}`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <Link
                        href={getHubProductHref(r)}
                        onClick={() => {
                          setShowDropdown(false);
                          setActiveIndex(-1);
                        }}
                        className={`p-4 cursor-pointer transition-colors flex justify-between items-center gap-4 block ${
                          isSelected
                            ? isAliExpress ? 'bg-orange-100' : 'bg-[#16C784]/15'
                            : isAliExpress ? 'hover:bg-orange-50' : 'hover:bg-[#16C784]/5'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{r.title}</p>
                          {r.category && <p className="text-xs text-gray-500 truncate">{r.category}</p>}
                        </div>
                        <span className={`text-sm font-bold whitespace-nowrap ${isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]'}`}>
                          {formatResultPrice(r.price, t('common.currency'))}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/hub/search?q=${encodeURIComponent(query)}`}
                onClick={() => {
                  setShowDropdown(false);
                  setActiveIndex(-1);
                }}
                className={`block p-3 text-center text-sm font-medium hover:bg-gray-50 border-t border-gray-100 ${
                  isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]'
                }`}
              >
                {t('common.seeAll')} →
              </Link>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500" role="status">{t('common.noResults')}</div>
          )}
        </div>
      )}
    </div>
  );
}
