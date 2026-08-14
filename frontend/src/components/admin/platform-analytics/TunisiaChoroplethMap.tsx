'use client';

import React, { useState, useMemo } from 'react';
import { MapPin, Globe, ZoomIn, ZoomOut, RotateCcw, TrendingUp, Users, ShoppingBag } from 'lucide-react';
import { formatMoney, formatNumber } from '@/lib/analytics-formatters';

export interface GovernorateData {
  code: string;
  name: string;
  name_ar: string;
  zone: 'grand_tunis' | 'cap_bon_sahel' | 'nord_ouest_centre' | 'sfax_sud';
  orders_count: number;
  gmv_tnd: number;
  active_visitors: number;
  svg_path: string;
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
  { code: 'TUN', name: 'Tunis', name_ar: 'تونس', zone: 'grand_tunis', orders_count: 1450, gmv_tnd: 87500.25, active_visitors: 420, svg_path: 'M 195 45 C 200 42, 208 45, 210 50 C 212 55, 205 60, 200 60 C 195 60, 192 50, 195 45 Z' },
  { code: 'ARI', name: 'Ariana', name_ar: 'أريانة', zone: 'grand_tunis', orders_count: 820, gmv_tnd: 49200.0, active_visitors: 210, svg_path: 'M 190 35 C 195 32, 205 35, 205 42 C 202 48, 192 48, 190 42 C 188 38, 188 35, 190 35 Z' },
  { code: 'BEN', name: 'Ben Arous', name_ar: 'بن عروس', zone: 'grand_tunis', orders_count: 760, gmv_tnd: 45600.0, active_visitors: 195, svg_path: 'M 195 58 C 205 58, 212 62, 210 70 C 208 75, 198 75, 195 70 C 192 65, 192 60, 195 58 Z' },
  { code: 'MAN', name: 'Manouba', name_ar: 'منوبة', zone: 'grand_tunis', orders_count: 430, gmv_tnd: 25800.0, active_visitors: 110, svg_path: 'M 178 45 C 188 45, 192 50, 190 58 C 185 62, 178 60, 175 55 C 175 48, 178 45, 178 45 Z' },

  // Cap Bon & Sahel
  { code: 'NAB', name: 'Nabeul', name_ar: 'نابل', zone: 'cap_bon_sahel', orders_count: 980, gmv_tnd: 58800.0, active_visitors: 260, svg_path: 'M 215 45 C 230 40, 245 55, 235 75 C 225 85, 212 75, 215 65 Z' },
  { code: 'ZAG', name: 'Zaghouan', name_ar: 'زغوان', zone: 'cap_bon_sahel', orders_count: 240, gmv_tnd: 14400.0, active_visitors: 65, svg_path: 'M 180 65 C 195 65, 202 75, 198 90 C 188 95, 175 88, 175 78 Z' },
  { code: 'BIZ', name: 'Bizerte', name_ar: 'بنزرت', zone: 'cap_bon_sahel', orders_count: 650, gmv_tnd: 39000.0, active_visitors: 180, svg_path: 'M 160 15 C 190 10, 205 25, 190 38 C 175 42, 160 35, 160 15 Z' },
  { code: 'SOU', name: 'Sousse', name_ar: 'سوسة', zone: 'cap_bon_sahel', orders_count: 1200, gmv_tnd: 72000.0, active_visitors: 340, svg_path: 'M 205 92 C 220 90, 228 105, 222 120 C 210 125, 200 115, 202 100 Z' },
  { code: 'MON', name: 'Monastir', name_ar: 'المنستير', zone: 'cap_bon_sahel', orders_count: 580, gmv_tnd: 34800.0, active_visitors: 155, svg_path: 'M 224 108 C 235 110, 238 122, 230 130 C 222 130, 220 120, 224 108 Z' },
  { code: 'MAH', name: 'Mahdia', name_ar: 'المهدية', zone: 'cap_bon_sahel', orders_count: 410, gmv_tnd: 24600.0, active_visitors: 115, svg_path: 'M 215 125 C 230 125, 232 145, 225 155 C 215 155, 210 140, 215 125 Z' },

  // Nord-Ouest & Centre
  { code: 'BEJ', name: 'Béja', name_ar: 'باجة', zone: 'nord_ouest_centre', orders_count: 310, gmv_tnd: 18600.0, active_visitors: 85, svg_path: 'M 140 35 C 160 35, 165 55, 155 70 C 142 70, 135 55, 140 35 Z' },
  { code: 'JEN', name: 'Jendouba', name_ar: 'جندوبة', zone: 'nord_ouest_centre', orders_count: 280, gmv_tnd: 16800.0, active_visitors: 75, svg_path: 'M 115 35 C 138 35, 138 60, 128 75 C 115 70, 110 50, 115 35 Z' },
  { code: 'KEF', name: 'Le Kef', name_ar: 'الكاف', zone: 'nord_ouest_centre', orders_count: 220, gmv_tnd: 13200.0, active_visitors: 60, svg_path: 'M 110 75 C 132 75, 135 100, 120 115 C 105 110, 102 90, 110 75 Z' },
  { code: 'SIL', name: 'Siliana', name_ar: 'سليانة', zone: 'nord_ouest_centre', orders_count: 190, gmv_tnd: 11400.0, active_visitors: 50, svg_path: 'M 140 75 C 168 75, 172 100, 158 115 C 142 115, 135 95, 140 75 Z' },
  { code: 'KAI', name: 'Kairouan', name_ar: 'القيروان', zone: 'nord_ouest_centre', orders_count: 510, gmv_tnd: 30600.0, active_visitors: 140, svg_path: 'M 165 95 C 198 95, 202 125, 185 145 C 165 145, 158 120, 165 95 Z' },
  { code: 'KAS', name: 'Kasserine', name_ar: 'القصرين', zone: 'nord_ouest_centre', orders_count: 260, gmv_tnd: 15600.0, active_visitors: 70, svg_path: 'M 105 120 C 142 120, 148 160, 125 185 C 100 175, 95 145, 105 120 Z' },
  { code: 'SID', name: 'Sidi Bouzid', name_ar: 'سيدي بوزيد', zone: 'nord_ouest_centre', orders_count: 290, gmv_tnd: 17400.0, active_visitors: 80, svg_path: 'M 145 135 C 178 135, 182 175, 160 195 C 140 190, 135 160, 145 135 Z' },

  // Sfax & Sud
  { code: 'SFA', name: 'Sfax', name_ar: 'صفاقس', zone: 'sfax_sud', orders_count: 1380, gmv_tnd: 82800.0, active_visitors: 390, svg_path: 'M 185 155 C 220 150, 235 185, 215 215 C 188 220, 175 185, 185 155 Z' },
  { code: 'GAF', name: 'Gafsa', name_ar: 'قفصة', zone: 'sfax_sud', orders_count: 340, gmv_tnd: 20400.0, active_visitors: 95, svg_path: 'M 115 190 C 152 190, 158 225, 135 245 C 112 240, 105 215, 115 190 Z' },
  { code: 'TOZ', name: 'Tozeur', name_ar: 'توزر', zone: 'sfax_sud', orders_count: 180, gmv_tnd: 10800.0, active_visitors: 50, svg_path: 'M 90 230 C 120 230, 122 260, 105 275 C 85 270, 80 250, 90 230 Z' },
  { code: 'KEB', name: 'Kébili', name_ar: 'قبلي', zone: 'sfax_sud', orders_count: 160, gmv_tnd: 9600.0, active_visitors: 45, svg_path: 'M 110 250 C 150 250, 155 290, 128 315 C 102 305, 98 275, 110 250 Z' },
  { code: 'GAB', name: 'Gabès', name_ar: 'قابس', zone: 'sfax_sud', orders_count: 450, gmv_tnd: 27000.0, active_visitors: 125, svg_path: 'M 160 225 C 195 225, 200 255, 180 275 C 160 275, 152 250, 160 225 Z' },
  { code: 'MED', name: 'Médenine', name_ar: 'مدنين', zone: 'sfax_sud', orders_count: 380, gmv_tnd: 22800.0, active_visitors: 105, svg_path: 'M 168 280 C 210 280, 215 320, 185 350 C 160 340, 152 305, 168 280 Z' },
  { code: 'TAT', name: 'Tataouine', name_ar: 'تطاوين', zone: 'sfax_sud', orders_count: 190, gmv_tnd: 11400.0, active_visitors: 55, svg_path: 'M 145 340 C 205 335, 210 420, 165 470 C 135 450, 128 385, 145 340 Z' },
];

export const DIASPORA_COUNTRIES: DiasporaCountryData[] = [
  { country_code: 'FR', country_name: 'France', flag_emoji: '🇫🇷', orders_count: 520, gmv_tnd: 42500.0, active_visitors: 280, share_pct: 45.2 },
  { country_code: 'DE', country_name: 'Germany', flag_emoji: '🇩🇪', orders_count: 210, gmv_tnd: 18900.0, active_visitors: 115, share_pct: 18.3 },
  { country_code: 'IT', country_name: 'Italy', flag_emoji: '🇮🇹', orders_count: 180, gmv_tnd: 14400.0, active_visitors: 95, share_pct: 15.6 },
  { country_code: 'CA', country_name: 'Canada', flag_emoji: '🇨🇦', orders_count: 95, gmv_tnd: 9800.0, active_visitors: 60, share_pct: 8.3 },
  { country_code: 'AE', country_name: 'United Arab Emirates', flag_emoji: '🇦🇪', orders_count: 85, gmv_tnd: 9200.0, active_visitors: 50, share_pct: 7.4 },
  { country_code: 'QA', country_name: 'Qatar', flag_emoji: '🇶🇦', orders_count: 60, gmv_tnd: 6600.0, active_visitors: 35, share_pct: 5.2 },
];

export function calculateHeatIntensityColor(value: number, max: number): string {
  if (!max || max <= 0 || !value || value <= 0) return '#f1f5f9';
  const ratio = Math.min(1, Math.max(0, value / max));
  if (ratio >= 0.8) return '#4338ca'; // indigo-700
  if (ratio >= 0.5) return '#6366f1'; // indigo-500
  if (ratio >= 0.25) return '#818cf8'; // indigo-400
  if (ratio >= 0.1) return '#c7d2fe'; // indigo-200
  return '#e0e7ff'; // indigo-100
}

interface TunisiaChoroplethMapProps {
  onGovernorateClick?: (gov: GovernorateData) => void;
  currency?: string;
}

export function TunisiaChoroplethMap({ onGovernorateClick, currency = 'TND' }: TunisiaChoroplethMapProps) {
  const [activeView, setActiveView] = useState<'tunisia' | 'diaspora'>('tunisia');
  const [metric, setMetric] = useState<'orders' | 'gmv' | 'visitors'>('orders');
  const [hoveredGov, setHoveredGov] = useState<GovernorateData | null>(null);
  const [selectedGov, setSelectedGov] = useState<GovernorateData | null>(ALL_24_GOVERNORATES[0]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const maxVal = useMemo(() => {
    return Math.max(
      ...ALL_24_GOVERNORATES.map((g) =>
        metric === 'orders' ? g.orders_count : metric === 'gmv' ? g.gmv_tnd : g.active_visitors
      )
    );
  }, [metric]);

  const totalNationalOrders = useMemo(() => ALL_24_GOVERNORATES.reduce((acc, g) => acc + g.orders_count, 0), []);
  const totalNationalGmv = useMemo(() => ALL_24_GOVERNORATES.reduce((acc, g) => acc + g.gmv_tnd, 0), []);
  const totalDiasporaOrders = useMemo(() => DIASPORA_COUNTRIES.reduce((acc, d) => acc + d.orders_count, 0), []);
  const totalDiasporaGmv = useMemo(() => DIASPORA_COUNTRIES.reduce((acc, d) => acc + d.gmv_tnd, 0), []);

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Geographic Heatmap & Regional Demand
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                24 Tunisian Governorates & Global Diaspora Distribution
              </p>
            </div>
          </div>
        </div>

        {/* View & Metric Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tunisia vs Diaspora Switch */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveView('tunisia')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeView === 'tunisia'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🇹🇳 24 Governorates
            </button>
            <button
              type="button"
              onClick={() => setActiveView('diaspora')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeView === 'diaspora'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 inline mr-1" /> Global Diaspora
            </button>
          </div>

          {/* Metric Selector */}
          {activeView === 'tunisia' && (
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setMetric('orders')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  metric === 'orders'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Orders
              </button>
              <button
                type="button"
                onClick={() => setMetric('gmv')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  metric === 'gmv'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                GMV
              </button>
              <button
                type="button"
                onClick={() => setMetric('visitors')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  metric === 'visitors'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Visitors
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      {activeView === 'tunisia' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive SVG Choropleth Map */}
          <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950/60 rounded-3xl p-6 border border-slate-200/70 dark:border-slate-800/80 relative overflow-hidden flex flex-col items-center">
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm z-10">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.2))}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* SVG Map Container */}
            <div className="w-full flex justify-center py-4">
              <svg
                viewBox="0 0 320 500"
                className="w-full max-w-[320px] h-auto drop-shadow-md transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {ALL_24_GOVERNORATES.map((gov) => {
                  const val = metric === 'orders' ? gov.orders_count : metric === 'gmv' ? gov.gmv_tnd : gov.active_visitors;
                  const fillColor = calculateHeatIntensityColor(val, maxVal);
                  const isHovered = hoveredGov?.code === gov.code;
                  const isSelected = selectedGov?.code === gov.code;

                  return (
                    <g key={gov.code}>
                      <path
                        d={gov.svg_path}
                        fill={fillColor}
                        stroke={isSelected ? '#0f172a' : isHovered ? '#4338ca' : '#94a3b8'}
                        strokeWidth={isSelected ? '2.5' : isHovered ? '2' : '1'}
                        className="cursor-pointer transition-colors duration-200"
                        onMouseEnter={() => setHoveredGov(gov)}
                        onMouseLeave={() => setHoveredGov(null)}
                        onClick={() => {
                          setSelectedGov(gov);
                          onGovernorateClick?.(gov);
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Map Legend */}
            <div className="w-full flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500">
              <span>Low Volume</span>
              <div className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#e0e7ff] border border-slate-300" />
                <span className="w-3.5 h-3.5 rounded-sm bg-[#c7d2fe]" />
                <span className="w-3.5 h-3.5 rounded-sm bg-[#818cf8]" />
                <span className="w-3.5 h-3.5 rounded-sm bg-[#6366f1]" />
                <span className="w-3.5 h-3.5 rounded-sm bg-[#4338ca]" />
              </div>
              <span>Very High Volume</span>
            </div>
          </div>

          {/* Governorate Detail Sidebar & Top Regional Ranks */}
          <div className="lg:col-span-5 space-y-4">
            {/* Active Governorate Inspector */}
            {(hoveredGov || selectedGov) && (
              <div className="p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                      Selected Governorate
                    </span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                      {(hoveredGov || selectedGov)!.name} / {(hoveredGov || selectedGov)!.name_ar}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-mono text-xs font-black">
                    {(hoveredGov || selectedGov)!.code}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-800/40">
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Orders</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">
                      {formatNumber((hoveredGov || selectedGov)!.orders_count)}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">GMV</span>
                    <strong className="text-sm font-black text-emerald-600">
                      {formatMoney((hoveredGov || selectedGov)!.gmv_tnd, currency)}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Visitors</span>
                    <strong className="text-sm font-black text-purple-600">
                      {formatNumber((hoveredGov || selectedGov)!.active_visitors)}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium flex items-center justify-between pt-1">
                  <span>National Order Share:</span>
                  <strong>
                    {(((hoveredGov || selectedGov)!.orders_count / totalNationalOrders) * 100).toFixed(1)}%
                  </strong>
                </div>
              </div>
            )}

            {/* Top 5 Governorates Leaderboard */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                Top 5 Regional Commercial Hubs
              </span>
              <div className="space-y-2">
                {[...ALL_24_GOVERNORATES]
                  .sort((a, b) => b.gmv_tnd - a.gmv_tnd)
                  .slice(0, 5)
                  .map((gov, idx) => (
                    <div
                      key={gov.code}
                      onClick={() => setSelectedGov(gov)}
                      className="p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black flex items-center justify-center text-slate-500">
                          #{idx + 1}
                        </span>
                        <div>
                          <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                            {gov.name}
                          </strong>
                          <span className="text-[10px] text-slate-400">
                            {formatNumber(gov.orders_count)} orders
                          </span>
                        </div>
                      </div>
                      <strong className="text-xs font-black text-emerald-600">
                        {formatMoney(gov.gmv_tnd, currency)}
                      </strong>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Global Diaspora Country Distribution */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-600">Total Diaspora GMV</span>
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatMoney(totalDiasporaGmv, currency)}</p>
              <span className="text-[10px] text-slate-400">Direct cross-border checkout</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-600">Total Diaspora Orders</span>
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatNumber(totalDiasporaOrders)} orders</p>
              <span className="text-[10px] text-slate-400">International cards & PayPal</span>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-600">Top Destination</span>
              <p className="text-xl font-black text-slate-900 dark:text-white">France 🇫🇷 (45.2%)</p>
              <span className="text-[10px] text-slate-400">Largest diaspora corridor</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-600">Gulf Region (UAE/QA/SA)</span>
              <p className="text-xl font-black text-slate-900 dark:text-white">20.9% Share</p>
              <span className="text-[10px] text-slate-400">High basket size (AOV 110 TND)</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-right">GMV ({currency})</th>
                  <th className="py-3 px-4 text-center">Active Visitors</th>
                  <th className="py-3 px-4 text-right">Diaspora Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {DIASPORA_COUNTRIES.map((country) => (
                  <tr key={country.country_code} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-lg">{country.flag_emoji}</span>
                      <span>{country.country_name}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300">
                      {formatNumber(country.orders_count)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600">
                      {formatMoney(country.gmv_tnd, currency)}
                    </td>
                    <td className="py-3 px-4 text-center text-purple-600 font-bold">
                      {formatNumber(country.active_visitors)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                        {country.share_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
