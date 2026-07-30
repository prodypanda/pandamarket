'use client';

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Database, Calculator, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { MetricDefinitionDTO } from '@/types/analytics';
import { fetchMetricDefinitions } from '@/lib/admin-platform-analytics';

interface MetricDefinitionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetricDefinitionsModal: React.FC<MetricDefinitionsModalProps> = ({ isOpen, onClose }) => {
  const [definitions, setDefinitions] = useState<MetricDefinitionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    fetchMetricDefinitions()
      .then((defs) => {
        setDefinitions(defs);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load metric definitions');
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Platform Metric Definitions & Formulas</h3>
              <p className="text-xs text-slate-500">
                Transparent documentation of calculations, source tables, and caveats for auditing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-xs font-semibold text-slate-400">
              Loading metric definitions...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
              {error}
            </div>
          ) : (
            definitions.map((def) => (
              <div
                key={def.key}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">{def.label}</h4>
                    <p className="mt-1 text-xs text-slate-600">{def.description}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold capitalize ${
                      def.availability === 'available'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {def.availability === 'available' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    <span>{def.availability}</span>
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-xs md:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Database className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700">Source Tables: </span>
                      <span className="font-mono text-slate-600">{def.source_tables.join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calculator className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700">Scope: </span>
                      <span className="font-semibold text-slate-600 capitalize">
                        {def.scope.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 font-mono text-[11px] text-slate-700 bg-slate-100 rounded-lg p-2.5">
                  <span className="font-bold text-indigo-700">Calculation: </span>
                  {def.calculation}
                </div>

                {def.caveats.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/60">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Caveat: </span>
                      <span>{def.caveats.join(' ')}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
