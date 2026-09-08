'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDashboardStyle, DashboardStyle, AccentColor } from '@/contexts/DashboardStyleContext';
import { useAdminTheme, AdminTheme, AdminAccentColor } from '@/contexts/AdminThemeContext';
import { Sparkles, LayoutDashboard, FileText, ChevronDown, Check, Palette, Terminal, Shield } from 'lucide-react';

export function SellerThemeSwitcherDropdown() {
  const { dashboardStyle, setDashboardStyle, accent, setAccent } = useDashboardStyle();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: Array<{ id: DashboardStyle; label: string; icon: React.ComponentType<{ className?: string }>; desc: string; badge: string }> = [
    {
      id: 'rego',
      label: 'ReGo Modern',
      icon: Sparkles,
      desc: 'Design moderne épuré, métriques fluides & anti-refus COD',
      badge: 'Nouveau',
    },
    {
      id: 'bento',
      label: 'Bento Cockpit',
      icon: LayoutDashboard,
      desc: 'Grille bento télémétrique à haute densité opérationnelle',
      badge: 'Cockpit',
    },
    {
      id: 'classic',
      label: 'Classique',
      icon: FileText,
      desc: 'Affichage tabulaire standard et spacieux',
      badge: 'Standard',
    },
  ];

  const accents: Array<{ id: AccentColor; label: string; color: string }> = [
    { id: 'rouge', label: 'Panda Rouge', color: '#ad0505' },
    { id: 'ocre', label: 'Ocre Terracotta', color: '#c25e2e' },
    { id: 'olive', label: 'Olive Méditerranée', color: '#5a7d36' },
    { id: 'bleu', label: 'Bleu Sidi Bou Saïd', color: '#1e6091' },
    { id: 'prune', label: 'Prune Artisanale', color: '#7b2cbf' },
    { id: 'charbon', label: 'Charbon Tunis', color: '#343a40' },
  ];

  const currentTheme = themes.find((t) => t.id === dashboardStyle) || themes[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all"
        title="Changer de Thème / Style"
      >
        <currentTheme.icon className="w-3.5 h-3.5 text-[#ad0505]" />
        <span className="hidden sm:inline truncate max-w-[100px]">{currentTheme.label}</span>
        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-50 text-[#ad0505] font-extrabold uppercase">
          {currentTheme.badge}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xl z-50 animate-dropdown-in">
          <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Style du Tableau de Bord
            </span>
            <span className="text-[10px] text-slate-400">Vendeur</span>
          </div>

          <div className="space-y-1">
            {themes.map((t) => {
              const Icon = t.icon;
              const isSelected = dashboardStyle === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setDashboardStyle(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left rounded-lg p-2 text-xs flex items-start gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-red-50 dark:bg-red-950/30 text-[#ad0505] border border-red-200 dark:border-red-900/50 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-md mt-0.5 ${isSelected ? 'bg-[#ad0505] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate">{t.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#ad0505]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {t.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Accent Color Palette Selector */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="px-2 mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Palette Régionale
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">{accent}</span>
            </div>
            <div className="grid grid-cols-6 gap-1 px-1">
              {accents.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccent(acc.id)}
                  title={acc.label}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    accent === acc.id ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white' : ''
                  }`}
                  style={{ backgroundColor: acc.color }}
                >
                  {accent === acc.id && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminThemeSwitcherDropdown() {
  const { adminTheme, setAdminTheme, accent, setAccent } = useAdminTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: Array<{ id: AdminTheme; label: string; icon: React.ComponentType<{ className?: string }>; desc: string; badge: string }> = [
    {
      id: 'rego',
      label: 'ReGo Modern',
      icon: Sparkles,
      desc: 'Design unifié moderne avec télémétrie fluide',
      badge: 'ReGo',
    },
    {
      id: 'command',
      label: 'Mission Control',
      icon: Terminal,
      desc: 'Mode télémétrie sombre haute densité pour modérateurs',
      badge: 'Ops',
    },
    {
      id: 'enterprise',
      label: 'Enterprise Clean',
      icon: Shield,
      desc: "Interface de gouvernance d'entreprise claire et structurée",
      badge: 'Corp',
    },
  ];

  const currentTheme = themes.find((t) => t.id === adminTheme) || themes[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all"
        title="Changer de Thème Superadmin"
      >
        <currentTheme.icon className="w-3.5 h-3.5 text-[#ad0505]" />
        <span className="hidden sm:inline truncate max-w-[100px]">{currentTheme.label}</span>
        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-50 text-[#ad0505] font-extrabold uppercase">
          {currentTheme.badge}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xl z-50 animate-dropdown-in">
          <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Interface Superadmin
            </span>
            <span className="text-[10px] text-slate-400">Admin</span>
          </div>

          <div className="space-y-1">
            {themes.map((t) => {
              const Icon = t.icon;
              const isSelected = adminTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setAdminTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left rounded-lg p-2 text-xs flex items-start gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-red-50 dark:bg-red-950/30 text-[#ad0505] border border-red-200 dark:border-red-900/50 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-md mt-0.5 ${isSelected ? 'bg-[#ad0505] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate">{t.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#ad0505]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {t.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
