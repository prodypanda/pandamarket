'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, User, ChevronDown, Loader2, Package } from 'lucide-react';
import type { ThemeConfig } from '../../lib/themes';
import {
  type StoreBranding,
  type StoreNavigationData,
  type StoreMenuItem,
  getStoreBrandLogo,
  getLogoSurfaceForColor,
  getStoreThemeLogoSurface,
  useThemeCustomization,
  formatStorePrice,
} from '../themes/shared';
import { StorefrontThemeCartLink } from '../themes/StorefrontThemeCartLink';
import { trackSearchPerformed, trackSearchResultClicked } from '../../lib/marketplace-analytics';

export type HeaderVariant =
  | 'classic'
  | 'centered'
  | 'split'
  | 'minimal'
  | 'transparent-overlay'
  | 'sticky-condensed';

export interface StorefrontHeaderProps {
  storeName: string;
  branding?: StoreBranding;
  theme: ThemeConfig;
  navigation?: StoreNavigationData;
  variant?: HeaderVariant;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  categories?: string[];
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  storeId?: string;
}

interface SearchSuggestion {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  price: number | string;
  thumbnail?: string | null;
}

function StorefrontSearchBar({
  storeId,
  storePathBase,
  searchQuery = '',
  onSearchChange,
  headerTextColor,
  backgroundColor,
  isMobile = false,
  onCloseMobileMenu,
}: {
  storeId?: string;
  storePathBase: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  headerTextColor: string;
  backgroundColor: string;
  isMobile?: boolean;
  onCloseMobileMenu?: () => void;
}) {
  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInternalQuery(searchQuery);
  }, [searchQuery]);

  // Debounced autocomplete fetch
  useEffect(() => {
    const q = internalQuery.trim();
    if (q.length < 2 || !storeId) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/search/storefront/suggest?store_id=${encodeURIComponent(storeId)}&q=${encodeURIComponent(q)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const items: SearchSuggestion[] = data.suggestions || [];
          setSuggestions(items);
          setIsOpen(true);
          setHighlightedIndex(-1);
          trackSearchPerformed(q, items.length, storeId);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [internalQuery, storeId]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item: SearchSuggestion) => {
    trackSearchResultClicked(item.id, internalQuery);
    setIsOpen(false);
    onCloseMobileMenu?.();
    router.push(`${storePathBase}/product/${item.slug}`);
  };

  const handleExecuteSearch = (q: string) => {
    setIsOpen(false);
    onCloseMobileMenu?.();
    const queryStr = q.trim();
    if (queryStr) {
      router.push(`${storePathBase}/products?q=${encodeURIComponent(queryStr)}`);
    } else {
      router.push(`${storePathBase}/products`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleExecuteSearch(internalQuery);
      }
      return;
    }

    const totalSelectable = suggestions.length + 1; // last option is "See all results"

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % totalSelectable);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalSelectable) % totalSelectable);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[highlightedIndex]);
      } else {
        handleExecuteSearch(internalQuery);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${isMobile ? 'w-full' : 'hidden md:flex flex-1 max-w-xs mx-4'}`}>
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={internalQuery}
          onChange={(e) => {
            setInternalQuery(e.target.value);
            onSearchChange?.(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="search-suggestions-dropdown"
          className="w-full py-2 pl-3.5 pr-9 text-xs rounded-xl border focus:outline-none focus:ring-1 transition-all"
          style={{
            borderColor: `${headerTextColor}30`,
            backgroundColor: backgroundColor,
            color: headerTextColor,
          }}
        />
        <button
          type="button"
          onClick={() => handleExecuteSearch(internalQuery)}
          aria-label="Lancer la recherche"
          className="absolute right-2.5 top-2.5 hover:opacity-80 transition-opacity"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <Search className="w-4 h-4" style={{ color: `${headerTextColor}60` }} />
          )}
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          id="search-suggestions-dropdown"
          className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl shadow-2xl border bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 overflow-hidden divide-y dark:divide-slate-800 border-gray-100 dark:border-slate-800"
        >
          {suggestions.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto py-1 text-xs">
              {suggestions.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                        isHighlighted ? 'bg-emerald-50 dark:bg-slate-800 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          width={36}
                          height={36}
                          unoptimized
                          className="w-9 h-9 object-cover rounded-lg flex-shrink-0 border border-gray-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-gray-400">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                        {item.category && (
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        {formatStorePrice(item.price)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
              Aucun produit trouvé pour &ldquo;<span className="font-semibold text-gray-700 dark:text-gray-200">{internalQuery}</span>&rdquo;
            </div>
          )}

          {/* See All Results Footer Action */}
          <button
            type="button"
            onClick={() => handleExecuteSearch(internalQuery)}
            onMouseEnter={() => setHighlightedIndex(suggestions.length)}
            className={`w-full text-center py-2.5 px-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-colors ${
              highlightedIndex === suggestions.length ? 'bg-emerald-50 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
            }`}
          >
            Voir tous les résultats pour &ldquo;{internalQuery}&rdquo; →
          </button>
        </div>
      )}
    </div>
  );
}

export function StorefrontHeader({
  storeName,
  branding,
  theme,
  navigation,
  variant = 'classic',
  searchQuery = '',
  onSearchChange,
  categories = [],
  activeCategory = '',
  onCategoryChange,
  storeId = branding?.store_id,
}: StorefrontHeaderProps) {
  const tc = useThemeCustomization(theme, branding);
  const logoUrl = getStoreBrandLogo(
    branding,
    getLogoSurfaceForColor(tc.colors.primary, getStoreThemeLogoSurface(theme.id)),
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const storePathBase = branding?.store_path_base || '';

  // Extract header menu items from navigation data
  const headerMenu = navigation?.menus?.find((m) => m.location === 'header');
  const menuItems: StoreMenuItem[] = headerMenu?.items || [];

  // Handle Escape key & Focus Trap for Mobile Drawer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        toggleButtonRef.current?.focus();
      }

      if (e.key === 'Tab' && mobileMenuOpen && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [mobileMenuOpen],
  );

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen, handleKeyDown]);

  const headerTextColor =
    getLogoSurfaceForColor(tc.colors.headerBg) === 'dark' ? '#FFFFFF' : tc.colors.text;

  const renderMenuItemLabel = (item: StoreMenuItem) => {
    if (typeof item.localized_label === 'string') return item.localized_label;
    return item.localized_label.fr || item.localized_label.en || Object.values(item.localized_label)[0] || '';
  };

  const resolveItemHref = (item: StoreMenuItem) => {
    if (item.url) return item.url;
    if (item.type === 'category' && item.reference_id) {
      return `${storePathBase}/products?category=${encodeURIComponent(item.reference_id)}`;
    }
    if (item.type === 'product' && item.reference_id) {
      return `${storePathBase}/products/${encodeURIComponent(item.reference_id)}`;
    }
    return `${storePathBase}/`;
  };

  return (
    <header
      className={`relative z-40 transition-all ${
        variant === 'sticky-condensed'
          ? 'sticky top-0 shadow-md backdrop-blur-md bg-opacity-95'
          : variant === 'transparent-overlay'
            ? 'absolute top-0 left-0 right-0 bg-transparent text-white'
            : 'shadow-xs'
      }`}
      style={{
        backgroundColor: variant === 'transparent-overlay' ? 'transparent' : tc.colors.headerBg,
        color: headerTextColor,
      }}
    >
      {/* Top Bar / Announcement */}
      <div
        className="px-4 py-1.5 text-center text-xs font-semibold border-b"
        style={{
          backgroundColor: tc.colors.primary,
          color: tc.colors.background,
          borderColor: `${tc.colors.primary}20`,
        }}
      >
        <span>Livraison sécurisée partout en Tunisie • Satisfait ou Remboursé</span>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-4">
          <button
            ref={toggleButtonRef}
            className="lg:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-storefront-drawer"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link href={storePathBase || '/'} className="flex items-center gap-2">
            {logoUrl ? (
              <Image src={logoUrl} alt={storeName} width={180} height={36} unoptimized className="h-9 max-w-[180px] object-contain" />
            ) : (
              <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${theme.typography.headingStyle}`}>
                {storeName}
              </h1>
            )}
          </Link>
        </div>

        {/* Center: Primary Navigation (Desktop) */}
        {variant !== 'minimal' && (
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <Link
              href={storePathBase || '/'}
              className="hover:opacity-80 transition-opacity"
            >
              Accueil
            </Link>

            {menuItems.length > 0 ? (
              menuItems.map((item) => {
                const label = renderMenuItemLabel(item);
                const href = resolveItemHref(item);
                const hasChildren = item.children && item.children.length > 0;

                if (hasChildren) {
                  const isOpen = openDropdownId === item.id;
                  return (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => setOpenDropdownId(isOpen ? null : item.id)}
                        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        {label}
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {isOpen && (
                        <div
                          className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-xl border p-2 bg-white text-gray-900 z-50 space-y-1"
                        >
                          {item.children?.map((child) => (
                            <Link
                              key={child.id}
                              href={resolveItemHref(child)}
                              target={child.target}
                              className="block px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                              onClick={() => setOpenDropdownId(null)}
                            >
                              {renderMenuItemLabel(child)}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={href}
                    target={item.target}
                    rel={item.rel || undefined}
                    className="hover:opacity-80 transition-opacity"
                  >
                    {label}
                  </Link>
                );
              })
            ) : (
              <>
                {categories.slice(0, 5).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange?.(activeCategory === cat ? '' : cat)}
                    className={`hover:opacity-80 transition-opacity ${
                      activeCategory === cat ? 'font-bold underline' : ''
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </>
            )}
          </nav>
        )}

        {/* Search Bar (Desktop) */}
        {variant !== 'minimal' && (
          <StorefrontSearchBar
            storeId={storeId}
            storePathBase={storePathBase}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            headerTextColor={headerTextColor}
            backgroundColor={tc.colors.background}
          />
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link
            href={`${storePathBase}/account`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
            title="Mon Compte"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Mon Compte</span>
          </Link>

          <StorefrontThemeCartLink
            storeId={branding?.store_id}
            storeHost={branding?.store_host}
            storePathBase={branding?.store_path_base}
            primaryColor={tc.colors.accent}
            iconColor={headerTextColor}
            className="inline-flex items-center transition-opacity hover:opacity-80"
            icon="cart"
          />
        </div>
      </div>

      {/* Mobile Menu Drawer Modal */}
      {mobileMenuOpen && (
        <div
          id="mobile-storefront-drawer"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation principale"
        >
          {/* Overlay backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div
            ref={drawerRef}
            className="absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl overflow-y-auto flex flex-col transition-transform"
            style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}
          >
            {/* Drawer Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: `${tc.colors.text}15` }}
            >
              <span className="font-extrabold text-base">{storeName}</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 text-gray-500 hover:text-gray-900 transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Search & Links */}
            <div className="p-4 space-y-4 flex-1">
              <StorefrontSearchBar
                storeId={storeId}
                storePathBase={storePathBase}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                headerTextColor={tc.colors.text}
                backgroundColor={tc.colors.background}
                isMobile
                onCloseMobileMenu={() => setMobileMenuOpen(false)}
              />

              <nav className="space-y-1 text-sm font-semibold">
                <Link
                  href={storePathBase || '/'}
                  className="block px-3 py-2 rounded-xl hover:bg-black/5 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Accueil
                </Link>

                {menuItems.map((item) => (
                  <Link
                    key={item.id}
                    href={resolveItemHref(item)}
                    target={item.target}
                    className="block px-3 py-2 rounded-xl hover:bg-black/5 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {renderMenuItemLabel(item)}
                  </Link>
                ))}

                <Link
                  href={`${storePathBase}/account`}
                  className="block px-3 py-2 rounded-xl hover:bg-black/5 transition-colors text-emerald-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mon Compte Client
                </Link>
              </nav>

              {categories.length > 0 && (
                <div className="pt-4 border-t" style={{ borderColor: `${tc.colors.text}10` }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">
                    Catégories
                  </h3>
                  <nav className="space-y-1 text-xs">
                    <button
                      onClick={() => {
                        onCategoryChange?.('');
                        setMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 rounded-lg ${
                        !activeCategory ? 'font-bold bg-emerald-50 text-emerald-700' : ''
                      }`}
                    >
                      Toutes les catégories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          onCategoryChange?.(cat);
                          setMobileMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-1.5 rounded-lg ${
                          activeCategory === cat ? 'font-bold bg-emerald-50 text-emerald-700' : ''
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
