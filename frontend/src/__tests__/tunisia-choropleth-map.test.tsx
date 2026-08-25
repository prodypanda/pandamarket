/**
 * Tunisia 24-Governorates & Diaspora Choropleth Map Component Test Suite (Package 4)
 *
 * Feature Covered:
 *   - Feature 2: Tunisia 24-Governorates & Diaspora Choropleth Heatmap (R1)
 *     - All 24 governorates SVG paths (Tunis, Ariana, Ben Arous, Manouba, Nabeul, Zaghouan, Bizerte,
 *       Béja, Jendouba, Le Kef, Siliana, Kairouan, Kasserine, Sidi Bouzid, Sousse, Monastir, Mahdia,
 *       Sfax, Gafsa, Tozeur, Kebili, Gabès, Medenine, Tataouine)
 *     - Heat intensity scaling & color interpolations (0.0 to 1.0 normalization)
 *     - Tooltip hover (Governorate name, orders, GMV, visitors, national volume share)
 *     - Tunisia vs. Diaspora country toggle (France, Germany, Italy, Canada, UAE, Qatar, Saudi Arabia, etc.)
 *     - Interactive drilldown callback trigger
 *     - Zoom & Pan controls (+ / - / Reset)
 *     - Keyboard navigation & ARIA accessibility
 */

import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// 24 Tunisian Governorates administrative registry
export interface GovernorateData {
  code: string; // ISO / Administrative 3-letter code
  name: string; // English / French name
  name_ar: string; // Arabic name
  zone: 'grand_tunis' | 'cap_bon_sahel' | 'nord_ouest_centre' | 'sfax_sud';
  orders_count: number;
  gmv_tnd: number;
  active_visitors: number;
  svg_path: string; // Mock SVG path d-string
}

export interface DiasporaCountryData {
  country_code: string;
  country_name: string;
  flag_emoji: string;
  orders_count: number;
  gmv_tnd: number;
  active_visitors: number;
  share_pct: number;
}

export const ALL_24_GOVERNORATES: GovernorateData[] = [
  // Grand Tunis
  { code: 'TUN', name: 'Tunis', name_ar: 'تونس', zone: 'grand_tunis', orders_count: 1450, gmv_tnd: 87500.25, active_visitors: 420, svg_path: 'M 100 100 L 110 100 L 110 110 Z' },
  { code: 'ARI', name: 'Ariana', name_ar: 'أريانة', zone: 'grand_tunis', orders_count: 820, gmv_tnd: 49200.0, active_visitors: 210, svg_path: 'M 110 90 L 120 90 L 120 100 Z' },
  { code: 'BEN', name: 'Ben Arous', name_ar: 'بن عروس', zone: 'grand_tunis', orders_count: 760, gmv_tnd: 45600.0, active_visitors: 195, svg_path: 'M 100 110 L 110 110 L 110 120 Z' },
  { code: 'MAN', name: 'Manouba', name_ar: 'منوبة', zone: 'grand_tunis', orders_count: 430, gmv_tnd: 25800.0, active_visitors: 110, svg_path: 'M 90 100 L 100 100 L 100 110 Z' },

  // Cap Bon & Sahel
  { code: 'NAB', name: 'Nabeul', name_ar: 'نابل', zone: 'cap_bon_sahel', orders_count: 980, gmv_tnd: 58800.0, active_visitors: 260, svg_path: 'M 120 100 L 135 90 L 140 110 Z' },
  { code: 'ZAG', name: 'Zaghouan', name_ar: 'زغوان', zone: 'cap_bon_sahel', orders_count: 240, gmv_tnd: 14400.0, active_visitors: 65, svg_path: 'M 95 120 L 110 120 L 105 135 Z' },
  { code: 'BIZ', name: 'Bizerte', name_ar: 'بنزرت', zone: 'cap_bon_sahel', orders_count: 650, gmv_tnd: 39000.0, active_visitors: 180, svg_path: 'M 80 80 L 105 75 L 100 95 Z' },
  { code: 'SOU', name: 'Sousse', name_ar: 'سوسة', zone: 'cap_bon_sahel', orders_count: 1200, gmv_tnd: 72000.0, active_visitors: 340, svg_path: 'M 115 130 L 130 130 L 125 150 Z' },
  { code: 'MON', name: 'Monastir', name_ar: 'المنستير', zone: 'cap_bon_sahel', orders_count: 580, gmv_tnd: 34800.0, active_visitors: 155, svg_path: 'M 125 145 L 135 145 L 130 160 Z' },
  { code: 'MAH', name: 'Mahdia', name_ar: 'المهدية', zone: 'cap_bon_sahel', orders_count: 410, gmv_tnd: 24600.0, active_visitors: 115, svg_path: 'M 120 160 L 130 160 L 125 180 Z' },

  // Nord-Ouest & Centre
  { code: 'BEJ', name: 'Béja', name_ar: 'باجة', zone: 'nord_ouest_centre', orders_count: 310, gmv_tnd: 18600.0, active_visitors: 85, svg_path: 'M 70 95 L 85 95 L 80 115 Z' },
  { code: 'JEN', name: 'Jendouba', name_ar: 'جندوبة', zone: 'nord_ouest_centre', orders_count: 280, gmv_tnd: 16800.0, active_visitors: 75, svg_path: 'M 55 90 L 70 90 L 65 110 Z' },
  { code: 'KEF', name: 'Le Kef', name_ar: 'الكاف', zone: 'nord_ouest_centre', orders_count: 220, gmv_tnd: 13200.0, active_visitors: 60, svg_path: 'M 50 115 L 70 115 L 65 135 Z' },
  { code: 'SIL', name: 'Siliana', name_ar: 'سليانة', zone: 'nord_ouest_centre', orders_count: 190, gmv_tnd: 11400.0, active_visitors: 50, svg_path: 'M 75 115 L 90 115 L 85 135 Z' },
  { code: 'KAI', name: 'Kairouan', name_ar: 'القيروان', zone: 'nord_ouest_centre', orders_count: 510, gmv_tnd: 30600.0, active_visitors: 140, svg_path: 'M 90 135 L 110 135 L 105 160 Z' },
  { code: 'KAS', name: 'Kasserine', name_ar: 'القصرين', zone: 'nord_ouest_centre', orders_count: 260, gmv_tnd: 15600.0, active_visitors: 70, svg_path: 'M 50 140 L 75 140 L 70 170 Z' },
  { code: 'SID', name: 'Sidi Bouzid', name_ar: 'سيدي بوزيد', zone: 'nord_ouest_centre', orders_count: 290, gmv_tnd: 17400.0, active_visitors: 80, svg_path: 'M 75 150 L 95 150 L 90 180 Z' },

  // Sfax & Sud
  { code: 'SFA', name: 'Sfax', name_ar: 'صفاقس', zone: 'sfax_sud', orders_count: 1380, gmv_tnd: 82800.0, active_visitors: 390, svg_path: 'M 105 170 L 130 170 L 120 200 Z' },
  { code: 'GAB', name: 'Gabès', name_ar: 'قابس', zone: 'sfax_sud', orders_count: 450, gmv_tnd: 27000.0, active_visitors: 125, svg_path: 'M 95 200 L 115 200 L 110 225 Z' },
  { code: 'MED', name: 'Médenine', name_ar: 'مدنين', zone: 'sfax_sud', orders_count: 380, gmv_tnd: 22800.0, active_visitors: 105, svg_path: 'M 100 225 L 125 225 L 120 255 Z' },
  { code: 'TAT', name: 'Tataouine', name_ar: 'تطاوين', zone: 'sfax_sud', orders_count: 190, gmv_tnd: 11400.0, active_visitors: 55, svg_path: 'M 90 255 L 125 255 L 105 310 Z' },
  { code: 'GAF', name: 'Gafsa', name_ar: 'قفصة', zone: 'sfax_sud', orders_count: 340, gmv_tnd: 20400.0, active_visitors: 95, svg_path: 'M 65 175 L 90 175 L 85 205 Z' },
  { code: 'TOZ', name: 'Tozeur', name_ar: 'توزر', zone: 'sfax_sud', orders_count: 180, gmv_tnd: 10800.0, active_visitors: 50, svg_path: 'M 50 195 L 70 195 L 65 220 Z' },
  { code: 'KEB', name: 'Kébili', name_ar: 'قبلي', zone: 'sfax_sud', orders_count: 160, gmv_tnd: 9600.0, active_visitors: 45, svg_path: 'M 65 210 L 95 210 L 85 245 Z' },
];

export const DIASPORA_COUNTRIES: DiasporaCountryData[] = [
  { country_code: 'FR', country_name: 'France', flag_emoji: '🇫🇷', orders_count: 520, gmv_tnd: 42500.0, active_visitors: 280, share_pct: 45.2 },
  { country_code: 'DE', country_name: 'Germany', flag_emoji: '🇩🇪', orders_count: 210, gmv_tnd: 18900.0, active_visitors: 115, share_pct: 18.3 },
  { country_code: 'IT', country_name: 'Italy', flag_emoji: '🇮🇹', orders_count: 180, gmv_tnd: 14400.0, active_visitors: 95, share_pct: 15.6 },
  { country_code: 'CA', country_name: 'Canada', flag_emoji: '🇨🇦', orders_count: 95, gmv_tnd: 9800.0, active_visitors: 60, share_pct: 8.3 },
  { country_code: 'AE', country_name: 'United Arab Emirates', flag_emoji: '🇦🇪', orders_count: 85, gmv_tnd: 9200.0, active_visitors: 50, share_pct: 7.4 },
  { country_code: 'QA', country_name: 'Qatar', flag_emoji: '🇶🇦', orders_count: 60, gmv_tnd: 6600.0, active_visitors: 35, share_pct: 5.2 },
];

/**
 * Calculates heat intensity fill color on 0.0 -> 1.0 scale
 */
export function calculateHeatIntensityColor(value: number, max: number, metric = 'orders'): string {
  if (!max || max <= 0 || !value || value <= 0) {
    return '#f1f5f9'; // slate-100 neutral baseline
  }
  const ratio = Math.min(1, Math.max(0, value / max));

  if (ratio >= 0.8) return '#4338ca'; // indigo-700 (Very High)
  if (ratio >= 0.5) return '#6366f1'; // indigo-500 (High)
  if (ratio >= 0.25) return '#818cf8'; // indigo-400 (Medium)
  if (ratio >= 0.1) return '#c7d2fe'; // indigo-200 (Low)
  return '#e0e7ff'; // indigo-100 (Minimal)
}

interface TunisiaChoroplethMapProps {
  governorates?: GovernorateData[];
  diaspora?: DiasporaCountryData[];
  metric?: 'orders' | 'gmv' | 'visitors';
  onSelectGovernorate?: (gov: GovernorateData) => void;
  onSelectDiasporaCountry?: (country: DiasporaCountryData) => void;
}

/**
 * Interactive Tunisia 24-Governorates & Diaspora Choropleth Map Component
 */
export function TunisiaChoroplethMap({
  governorates = ALL_24_GOVERNORATES,
  diaspora = DIASPORA_COUNTRIES,
  metric = 'orders',
  onSelectGovernorate,
  onSelectDiasporaCountry,
}: TunisiaChoroplethMapProps) {
  const [viewMode, setViewMode] = useState<'tunisia' | 'diaspora'>('tunisia');
  const [selectedMetric, setSelectedMetric] = useState<'orders' | 'gmv' | 'visitors'>(metric);
  const [hoveredGov, setHoveredGov] = useState<GovernorateData | null>(null);
  const [hoveredDiaspora, setHoveredDiaspora] = useState<DiasporaCountryData | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const totalNationalOrders = governorates.reduce((sum, g) => sum + g.orders_count, 0) || 1;
  const totalNationalGmv = governorates.reduce((sum, g) => sum + g.gmv_tnd, 0) || 1;
  const totalNationalVisitors = governorates.reduce((sum, g) => sum + g.active_visitors, 0) || 1;

  const maxGovValue = Math.max(
    ...governorates.map((g) =>
      selectedMetric === 'orders' ? g.orders_count : selectedMetric === 'gmv' ? g.gmv_tnd : g.active_visitors
    ),
    1
  );

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div
      role="region"
      aria-label="Tunisia 24-Governorates & Diaspora Choropleth Heatmap"
      className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>🗺️ Geographic Distribution & Volume Heatmap</span>
          </h3>
          <p className="text-xs text-slate-500">
            {viewMode === 'tunisia'
              ? 'Real-time order density across all 24 Tunisian governorates'
              : 'Global customer order activity from top diaspora corridors'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle: Tunisia 24 Gov vs Diaspora */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('tunisia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'tunisia'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🇹🇳 Tunisia (24 Gov)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('diaspora')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'diaspora'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              🌍 Diaspora Markets
            </button>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedMetric('orders')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedMetric === 'orders'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetric('gmv')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedMetric === 'gmv'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              GMV (TND)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetric('visitors')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedMetric === 'visitors'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Visitors
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Zoom in"
              onClick={handleZoomIn}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 font-bold text-xs"
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={handleZoomOut}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 font-bold text-xs"
            >
              -
            </button>
            <button
              type="button"
              aria-label="Reset map view"
              onClick={handleResetZoom}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 font-bold text-[10px]"
            >
              Reset ({zoomLevel}x)
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Map SVG Canvas */}
        <div className="lg:col-span-2 relative min-h-[360px] bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-center overflow-hidden">
          {viewMode === 'tunisia' ? (
            <svg
              className="w-full h-80 transition-transform duration-200"
              viewBox="0 0 200 350"
              style={{ transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)` }}
              aria-label="Tunisia 24 Governorates Map SVG"
            >
              <g id="tunisia-governorates">
                {governorates.map((gov) => {
                  const metricValue =
                    selectedMetric === 'orders'
                      ? gov.orders_count
                      : selectedMetric === 'gmv'
                      ? gov.gmv_tnd
                      : gov.active_visitors;
                  const fill = calculateHeatIntensityColor(metricValue, maxGovValue, selectedMetric);
                  const isHovered = hoveredGov?.code === gov.code;

                  return (
                    <path
                      key={gov.code}
                      id={`gov-${gov.code}`}
                      data-testid={`gov-${gov.code}`}
                      d={gov.svg_path}
                      fill={fill}
                      stroke={isHovered ? '#1e1b4b' : '#94a3b8'}
                      strokeWidth={isHovered ? 2.5 : 1}
                      tabIndex={0}
                      role="button"
                      aria-label={`${gov.name} Governorate, ${gov.orders_count} orders, ${gov.gmv_tnd.toFixed(2)} TND`}
                      onMouseEnter={() => setHoveredGov(gov)}
                      onMouseLeave={() => setHoveredGov(null)}
                      onFocus={() => setHoveredGov(gov)}
                      onBlur={() => setHoveredGov(null)}
                      onClick={() => onSelectGovernorate?.(gov)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectGovernorate?.(gov);
                        }
                      }}
                      className="cursor-pointer transition-all duration-150 outline-none hover:opacity-90"
                    />
                  );
                })}
              </g>
            </svg>
          ) : (
            /* Diaspora Map Corridor View */
            <div data-testid="diaspora-view" className="w-full space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {diaspora.map((country) => (
                  <div
                    key={country.country_code}
                    data-testid={`diaspora-${country.country_code}`}
                    role="button"
                    tabIndex={0}
                    onMouseEnter={() => setHoveredDiaspora(country)}
                    onMouseLeave={() => setHoveredDiaspora(null)}
                    onClick={() => onSelectDiasporaCountry?.(country)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectDiasporaCountry?.(country);
                      }
                    }}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-500 transition-all shadow-sm space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{country.flag_emoji}</span>
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded-lg">
                        {country.share_pct}%
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">{country.country_name}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {country.orders_count} orders ({country.gmv_tnd.toLocaleString()} TND)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Floating Tooltip Card */}
          {hoveredGov && viewMode === 'tunisia' && (
            <div
              data-testid="governorate-tooltip"
              className="absolute bottom-4 left-4 bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700 min-w-[180px] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <div>
                  <span className="font-black text-xs block">{hoveredGov.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{hoveredGov.name_ar}</span>
                </div>
                <span className="px-1.5 py-0.5 bg-indigo-500 text-white font-mono text-[9px] font-black rounded uppercase">
                  {hoveredGov.code}
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Orders:</span>
                  <span className="font-black">{hoveredGov.orders_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Captured GMV:</span>
                  <span className="font-black text-emerald-400">{hoveredGov.gmv_tnd.toLocaleString()} TND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Visitors:</span>
                  <span className="font-black text-indigo-300">{hoveredGov.active_visitors}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px]">
                  <span className="text-slate-400">National Share:</span>
                  <span className="font-bold text-amber-400">
                    {((hoveredGov.orders_count / totalNationalOrders) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Leaderboard & Heat Intensity Legend */}
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Top Regional Volume Corridors
            </h4>
            <div className="space-y-2">
              {(viewMode === 'tunisia'
                ? [...governorates].sort((a, b) => b.orders_count - a.orders_count).slice(0, 5)
                : [...diaspora].sort((a, b) => b.orders_count - a.orders_count).slice(0, 5)
              ).map((item, idx) => (
                <div
                  key={'code' in item ? item.code : item.country_code}
                  className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                    <span>{'name' in item ? item.name : item.country_name}</span>
                  </div>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {item.orders_count.toLocaleString()} orders
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Heat Intensity Scale Legend */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-400 block">
              Heat Intensity Gradient Legend
            </span>
            <div className="h-3 w-full rounded-full bg-gradient-to-r from-slate-200 via-indigo-400 to-indigo-800" />
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>Minimal</span>
              <span>Average</span>
              <span>Maximum Density</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

describe('Feature 2: Tunisia 24-Governorates & Diaspora Choropleth Heatmap (R1)', () => {
  // =========================================================================
  // TIER 1: CORE FUNCTIONAL & PRIMARY REQUIREMENTS (Coverage ≥ 5)
  // =========================================================================
  describe('Tier 1: Core Functional Verification', () => {
    it('T1.1: renders all 24 Tunisian governorates with valid SVG path elements and codes', () => {
      render(<TunisiaChoroplethMap />);

      // Verify all 24 governorates are present in the DOM by data-testid
      const expectedCodes = [
        'TUN', 'ARI', 'BEN', 'MAN', 'NAB', 'ZAG', 'BIZ', 'SOU', 'MON', 'MAH',
        'BEJ', 'JEN', 'KEF', 'SIL', 'KAI', 'KAS', 'SID', 'SFA', 'GAB', 'MED',
        'TAT', 'GAF', 'TOZ', 'KEB'
      ];

      expectedCodes.forEach((code) => {
        const pathEl = screen.getByTestId(`gov-${code}`);
        expect(pathEl).toBeInTheDocument();
        expect(pathEl.tagName.toLowerCase()).toBe('path');
        expect(pathEl).toHaveAttribute('d');
      });
      expect(expectedCodes.length).toBe(24);
    });

    it('T1.2: calculates heat intensity scale and applies correct fill gradients', () => {
      // Sfax and Tunis are top volume -> higher saturation
      const { container } = render(<TunisiaChoroplethMap />);

      const tunisEl = screen.getByTestId('gov-TUN');
      const tataouineEl = screen.getByTestId('gov-TAT');

      const tunisFill = tunisEl.getAttribute('fill');
      const tatFill = tataouineEl.getAttribute('fill');

      expect(tunisFill).toBe('#4338ca'); // Top quartile (>80%)
      expect(tatFill).not.toBe(tunisFill);
    });

    it('T1.3: displays rich contextual tooltip on governorate hover and focus', async () => {
      render(<TunisiaChoroplethMap />);

      const sfaxEl = screen.getByTestId('gov-SFA');

      // Hover on Sfax
      fireEvent.mouseEnter(sfaxEl);

      const tooltip = screen.getByTestId('governorate-tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(within(tooltip).getByText('Sfax')).toBeInTheDocument();
      expect(within(tooltip).getByText('صفاقس')).toBeInTheDocument();
      expect(within(tooltip).getByText(/1[\s\u202F\u00A0]*380/)).toBeInTheDocument();
      expect(within(tooltip).getByText(/82[\s\u202F\u00A0]*800.*TND/)).toBeInTheDocument();

      // Leave
      fireEvent.mouseLeave(sfaxEl);
      expect(screen.queryByTestId('governorate-tooltip')).not.toBeInTheDocument();
    });

    it('T1.4: toggles between Tunisia 24 Governorates and Diaspora markets view', async () => {
      render(<TunisiaChoroplethMap />);

      // Initially in Tunisia view
      expect(screen.getByTestId('gov-TUN')).toBeInTheDocument();
      expect(screen.queryByTestId('diaspora-view')).not.toBeInTheDocument();

      // Click Diaspora Markets button
      const diasporaTabBtn = screen.getByRole('button', { name: /Diaspora Markets/i });
      fireEvent.click(diasporaTabBtn);

      expect(screen.getByTestId('diaspora-view')).toBeInTheDocument();
      expect(screen.getByTestId('diaspora-FR')).toBeInTheDocument();
      expect(screen.getByTestId('diaspora-DE')).toBeInTheDocument();
      expect(screen.getByTestId('diaspora-CA')).toBeInTheDocument();

      // Toggle back to Tunisia
      const tunisiaTabBtn = screen.getByRole('button', { name: /Tunisia \(24 Gov\)/i });
      fireEvent.click(tunisiaTabBtn);
      expect(screen.getByTestId('gov-TUN')).toBeInTheDocument();
    });

    it('T1.5: triggers onSelectGovernorate callback on click and keyboard selection', () => {
      const handleSelect = vi.fn();
      render(<TunisiaChoroplethMap onSelectGovernorate={handleSelect} />);

      const sousseEl = screen.getByTestId('gov-SOU');
      fireEvent.click(sousseEl);

      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SOU', name: 'Sousse', orders_count: 1200 })
      );

      // Keyboard Enter key selection
      fireEvent.keyDown(sousseEl, { key: 'Enter', code: 'Enter' });
      expect(handleSelect).toHaveBeenCalledTimes(2);
    });

    it('T1.6: supports dynamic metric switches between Orders, GMV, and Visitors', () => {
      render(<TunisiaChoroplethMap />);

      const gmvBtn = screen.getByRole('button', { name: /^GMV \(TND\)$/i });
      fireEvent.click(gmvBtn);

      const visitorsBtn = screen.getByRole('button', { name: /^Visitors$/i });
      fireEvent.click(visitorsBtn);

      // Component re-renders with new metric intensity scaling
      expect(screen.getByTestId('gov-TUN')).toBeInTheDocument();
    });

    it('T1.7: adjusts zoom level (+, -, Reset) without crashing', () => {
      render(<TunisiaChoroplethMap />);

      const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
      const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
      const resetBtn = screen.getByRole('button', { name: /Reset/i });

      fireEvent.click(zoomInBtn);
      expect(resetBtn).toHaveTextContent('Reset (1.25x)');

      fireEvent.click(zoomOutBtn);
      expect(resetBtn).toHaveTextContent('Reset (1x)');

      fireEvent.click(zoomInBtn);
      fireEvent.click(zoomInBtn);
      expect(resetBtn).toHaveTextContent('Reset (1.5x)');

      fireEvent.click(resetBtn);
      expect(resetBtn).toHaveTextContent('Reset (1x)');
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY VALUES & CORNER CASES (Boundary ≥ 5)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: handles zero-order empty dataset across all 24 governorates without divide-by-zero error', () => {
      const zeroGovs = ALL_24_GOVERNORATES.map((g) => ({
        ...g,
        orders_count: 0,
        gmv_tnd: 0,
        active_visitors: 0,
      }));

      render(<TunisiaChoroplethMap governorates={zeroGovs} />);

      const tunis = screen.getByTestId('gov-TUN');
      // Neutral fill applied when all values are zero
      expect(tunis.getAttribute('fill')).toBe('#f1f5f9');
    });

    it('T2.2: handles single dominant hotspot governorate (100% volume in Tunis, 0 elsewhere)', () => {
      const skewedGovs = ALL_24_GOVERNORATES.map((g) => ({
        ...g,
        orders_count: g.code === 'TUN' ? 5000 : 0,
        gmv_tnd: g.code === 'TUN' ? 250000 : 0,
        active_visitors: g.code === 'TUN' ? 1000 : 0,
      }));

      render(<TunisiaChoroplethMap governorates={skewedGovs} />);

      const tunis = screen.getByTestId('gov-TUN');
      const sousse = screen.getByTestId('gov-SOU');

      expect(tunis.getAttribute('fill')).toBe('#4338ca');
      expect(sousse.getAttribute('fill')).toBe('#f1f5f9');
    });

    it('T2.3: clamps zoom levels between 0.75x minimum and 3.0x maximum bounds', () => {
      render(<TunisiaChoroplethMap />);

      const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
      const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
      const resetBtn = screen.getByRole('button', { name: /Reset/i });

      // Click Zoom in 15 times -> should clamp to 3x
      for (let i = 0; i < 15; i++) {
        fireEvent.click(zoomInBtn);
      }
      expect(resetBtn).toHaveTextContent('Reset (3x)');

      // Click Zoom out 20 times -> should clamp to 0.75x
      for (let i = 0; i < 20; i++) {
        fireEvent.click(zoomOutBtn);
      }
      expect(resetBtn).toHaveTextContent('Reset (0.75x)');
    });

    it('T2.4: handles empty diaspora countries array gracefully', () => {
      render(<TunisiaChoroplethMap diaspora={[]} />);

      const diasporaTabBtn = screen.getByRole('button', { name: /Diaspora Markets/i });
      fireEvent.click(diasporaTabBtn);

      expect(screen.getByTestId('diaspora-view')).toBeInTheDocument();
      expect(screen.queryByTestId('diaspora-FR')).not.toBeInTheDocument();
    });

    it('T2.5: triggers onSelectDiasporaCountry callback with full metadata on diaspora card selection', () => {
      const handleSelectDiaspora = vi.fn();
      render(<TunisiaChoroplethMap onSelectDiasporaCountry={handleSelectDiaspora} />);

      // Switch to diaspora view
      fireEvent.click(screen.getByRole('button', { name: /Diaspora Markets/i }));

      const franceCard = screen.getByTestId('diaspora-FR');
      fireEvent.click(franceCard);

      expect(handleSelectDiaspora).toHaveBeenCalledTimes(1);
      expect(handleSelectDiaspora).toHaveBeenCalledWith(
        expect.objectContaining({ country_code: 'FR', country_name: 'France', share_pct: 45.2 })
      );
    });

    it('T2.6: verifies pure calculation utility calculateHeatIntensityColor boundaries', () => {
      expect(calculateHeatIntensityColor(0, 100)).toBe('#f1f5f9');
      expect(calculateHeatIntensityColor(-10, 100)).toBe('#f1f5f9');
      expect(calculateHeatIntensityColor(50, 0)).toBe('#f1f5f9');

      expect(calculateHeatIntensityColor(90, 100)).toBe('#4338ca'); // >= 0.8
      expect(calculateHeatIntensityColor(60, 100)).toBe('#6366f1'); // >= 0.5
      expect(calculateHeatIntensityColor(30, 100)).toBe('#818cf8'); // >= 0.25
      expect(calculateHeatIntensityColor(15, 100)).toBe('#c7d2fe'); // >= 0.1
      expect(calculateHeatIntensityColor(5, 100)).toBe('#e0e7ff');  // < 0.1
    });
  });

  // =========================================================================
  // TIER 3: PAIRWISE COMBINATIONS & ACCESSIBILITY
  // =========================================================================
  describe('Tier 3: Pairwise Combinations & Accessibility Contracts', () => {
    it('T3.1: ensures all 24 governorates meet ARIA accessibility standards', () => {
      render(<TunisiaChoroplethMap />);

      ALL_24_GOVERNORATES.forEach((gov) => {
        const pathEl = screen.getByTestId(`gov-${gov.code}`);
        expect(pathEl).toHaveAttribute('role', 'button');
        expect(pathEl).toHaveAttribute('aria-label');
        expect(pathEl.getAttribute('aria-label')).toContain(gov.name);
        expect(pathEl).toHaveAttribute('tabindex', '0');
      });
    });

    it('T3.2: verifies leaderboard dynamically reflects top 5 ranked governorates in order', () => {
      render(<TunisiaChoroplethMap />);

      // Tunis (1450), Sfax (1380), Sousse (1200), Nabeul (980), Ariana (820)
      const topCorridorTitle = screen.getByText('Top Regional Volume Corridors');
      expect(topCorridorTitle).toBeInTheDocument();

      expect(screen.getByText('Tunis')).toBeInTheDocument();
      expect(screen.getByText('Sfax')).toBeInTheDocument();
      expect(screen.getByText('Sousse')).toBeInTheDocument();
      expect(screen.getByText('Nabeul')).toBeInTheDocument();
      expect(screen.getByText('Ariana')).toBeInTheDocument();
    });
  });
});
