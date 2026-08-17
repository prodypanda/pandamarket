'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  X,
  Check,
  FolderTree,
  Tag,
  Layers,
} from 'lucide-react';
import {
  buildHierarchicalCategoryList,
  searchHierarchicalCategories,
  type BaseCategoryNode,
  type HierarchicalCategory,
} from '../../lib/category-tree';

export interface CategorySearchableSelectProps<T extends BaseCategoryNode = BaseCategoryNode> {
  categories: T[];
  value?: string | null;
  onChange: (categoryId: string, category?: T | null) => void;
  label?: string;
  placeholder?: string;
  emptyOptionLabel?: string;
  disabled?: boolean;
  className?: string;
  badgeColor?: 'red' | 'blue' | 'emerald' | 'amber' | 'slate';
  icon?: React.ComponentType<{ className?: string }>;
}

export function CategorySearchableSelect<T extends BaseCategoryNode = BaseCategoryNode>({
  categories,
  value,
  onChange,
  label,
  placeholder = 'Sélectionner une catégorie...',
  emptyOptionLabel = 'Non catégorisé',
  disabled = false,
  className = '',
  icon: IconComponent,
}: CategorySearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Build depth-first hierarchical list
  const hierarchicalList = useMemo(() => {
    return buildHierarchicalCategoryList(categories);
  }, [categories]);

  // 2. Filter list based on search query
  const filteredList = useMemo(() => {
    return searchHierarchicalCategories(hierarchicalList, searchQuery);
  }, [hierarchicalList, searchQuery]);

  // 3. Find currently selected category
  const selectedItem = useMemo(() => {
    if (!value) return null;
    return hierarchicalList.find((item) => item.id === value) || null;
  }, [hierarchicalList, value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (item: HierarchicalCategory<T> | null) => {
    if (!item) {
      onChange('', null);
    } else {
      onChange(item.id, item.category);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            {IconComponent && <IconComponent className="w-3.5 h-3.5 text-slate-500" />}
            {label}
          </span>
          {selectedItem && (
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold truncate max-w-[200px]">
              {selectedItem.pathString}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs rounded-xl border transition-all text-left outline-none ${
          isOpen
            ? 'border-[#B91C1C] ring-2 ring-[#B91C1C]/10 bg-white dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedItem ? (
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 dark:text-white truncate">
                  {selectedItem.name}
                </span>
                {selectedItem.level > 0 && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Niveau {selectedItem.level + 1}
                  </span>
                )}
              </div>
              {selectedItem.path.length > 1 && (
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold truncate">
                  {selectedItem.path.slice(0, -1).join(' › ')}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-600 dark:text-slate-400 font-bold truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedItem && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as any);
                }
              }}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Effacer la sélection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#B91C1C]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl shadow-slate-900/10 overflow-hidden flex flex-col max-h-80 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une catégorie ou sous-catégorie..."
              className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List Items */}
          <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5">
            {/* Unset Option */}
            {!searchQuery && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-bold text-left transition-colors ${
                  !value
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="italic flex items-center gap-2">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  {emptyOptionLabel}
                </span>
                {!value && <Check className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />}
              </button>
            )}

            {filteredList.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <FolderTree className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Aucune catégorie trouvée
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Essayez un autre mot-clé pour affiner votre recherche.
                </p>
              </div>
            ) : (
              filteredList.map((item) => {
                const isSelected = item.id === value;
                const isRoot = item.level === 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full group flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-[#B91C1C]/10 text-[#B91C1C] dark:bg-[#B91C1C]/20 font-black'
                        : isRoot
                        ? 'font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        : 'font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                    style={{
                      paddingLeft: searchQuery ? '0.75rem' : `${0.75 + item.level * 1.25}rem`,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Tree Branch Visuals when not searching */}
                      {!searchQuery && item.level > 0 && (
                        <span className="text-slate-300 dark:text-slate-600 font-mono text-[11px] select-none shrink-0">
                          └─
                        </span>
                      )}

                      {/* Icon */}
                      {isRoot ? (
                        <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      ) : (
                        <Tag className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                      )}

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{item.name}</span>
                        {/* Show full breadcrumb path if searching */}
                        {searchQuery && item.path.length > 1 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            {item.path.slice(0, -1).join(' › ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {item.productCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                          {item.productCount}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#B91C1C] shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer showing count */}
          <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-[10px] text-slate-400">
            <span>{hierarchicalList.length} catégories disponibles</span>
            <span>Sélection rapide</span>
          </div>
        </div>
      )}
    </div>
  );
}
