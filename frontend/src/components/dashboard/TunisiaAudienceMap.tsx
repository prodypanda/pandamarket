'use client';

import React, { useState } from 'react';
import { ALL_24_GOVERNORATES } from '@/components/admin/platform-analytics/TunisiaChoroplethMap';
import { MapPin, Users } from 'lucide-react';

export interface TunisiaAudienceMapProps {
  governorates: Record<string, number>;
  className?: string;
}

export const TunisiaAudienceMap: React.FC<TunisiaAudienceMapProps> = ({
  governorates = {},
  className = '',
}) => {
  const [hoveredGov, setHoveredGov] = useState<string | null>(null);

  const totalGovSubs = Object.values(governorates).reduce((a, b) => a + b, 0);
  const maxGovCount = Math.max(...Object.values(governorates), 1);
  const hasData = Object.keys(governorates).length > 0;

  return (
    <section
      className={`p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 ${className}`}
      data-testid="governorates-distribution-section"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>🇹🇳</span> Répartition par Gouvernorat
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Origine géographique de votre audience dans les 24 gouvernorats tunisiens.
          </p>
        </div>
        {hasData && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
            <Users className="w-3.5 h-3.5" />
            <span>{totalGovSubs.toLocaleString()} abonnés</span>
          </span>
        )}
      </div>

      {!hasData ? (
        <div
          className="p-8 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl"
          data-testid="empty-governorate-data"
        >
          Aucune donnée géographique pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Interactive SVG Preview */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
            <svg
              viewBox="240 -10 480 980"
              className="w-full max-h-48 drop-shadow-sm select-none"
              aria-label="Carte des abonnés par gouvernorat"
            >
              {ALL_24_GOVERNORATES.map((gov) => {
                const count = governorates[gov.name] || 0;
                const intensity = totalGovSubs > 0 ? count / maxGovCount : 0;
                const isHovered = hoveredGov === gov.name;

                // Color calculation based on subscriber density
                const fillColor =
                  count === 0
                    ? '#e2e8f0'
                    : intensity > 0.6
                    ? '#059669' // emerald-600
                    : intensity > 0.3
                    ? '#10b981' // emerald-500
                    : '#6ee7b7'; // emerald-300

                return (
                  <path
                    key={gov.code}
                    d={gov.svg_path}
                    fill={isHovered ? '#047857' : fillColor}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 1}
                    className="transition-colors duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredGov(gov.name)}
                    onMouseLeave={() => setHoveredGov(null)}
                  >
                    <title>{`${gov.name}: ${count} abonnés (${totalGovSubs > 0 ? ((count / totalGovSubs) * 100).toFixed(1) : 0}%)`}</title>
                  </path>
                );
              })}
            </svg>
          </div>

          {/* Governorates Progress List */}
          <div
            className="space-y-2.5 max-h-72 overflow-y-auto pr-2 scrollbar-thin"
            data-testid="governorates-list"
          >
            {Object.entries(governorates).map(([gov, count]) => {
              const pct = totalGovSubs > 0 ? ((count / totalGovSubs) * 100).toFixed(1) : '0.0';
              const isHovered = hoveredGov === gov;

              return (
                <div
                  key={gov}
                  data-testid={`gov-row-${gov}`}
                  className={`flex flex-col gap-1 p-1.5 rounded-lg transition-colors ${
                    isHovered ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : ''
                  }`}
                  onMouseEnter={() => setHoveredGov(gov)}
                  onMouseLeave={() => setHoveredGov(null)}
                >
                  <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <MapPin className={`w-3 h-3 ${count > 0 ? 'text-emerald-500' : 'text-zinc-400'}`} />
                      <span>{gov}</span>
                    </span>
                    <span>
                      {count} abonnés ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
