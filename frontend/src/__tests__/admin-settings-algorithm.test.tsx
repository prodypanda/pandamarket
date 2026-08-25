/**
 * Superadmin Platform Algorithm Settings & AI Health Diagnostic Test Suite
 *
 * Feature Covered:
 *   - Feature 20 / Requirement R4: Marketplace Hub Algorithm Tuning & Superadmin Control
 *     - Route: /admin/settings (Section: 'Hub Feed & Algorithm Tuning')
 *     - Base Sort Selector: 'random' (Session Shuffled), 'newest' (Datetime DESC), 'alphabetical' (A-Z), 'best_sellers' (Order Volume DESC)
 *     - Personalization Injection Slider: 0% to 50% (Default 30%) with live composition breakdown
 *     - AI Auto-Tagging Diagnostic Health Card (GET /api/pd/admin/analytics/ai-tagging-health)
 *     - Manual AI tag indexing / sweep trigger with progress indicator
 *     - Concurrency, dirty state tracking, and platform settings persistence
 */

import React, { useState, useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fetchWithCsrf } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

// ============================================================================
// Types & Contracts (PROJECT.md § Interface Contracts)
// ============================================================================
export type HubFeedBaseSort = 'random' | 'newest' | 'alphabetical' | 'best_sellers';

export interface FeedAlgorithmSettings {
  hub_feed_base_sort: HubFeedBaseSort;
  hub_feed_personalization_pct: number;
  ai_auto_tagging_enabled: boolean;
}

export interface AiTaggingHealthData {
  total_products: number;
  tagged_products: number;
  tag_coverage_pct: number;
  top_tags: Array<{ tag: string; count: number }>;
  pending_tag_jobs: number;
}

// ============================================================================
// AdminAlgorithmSettingsCard Component (Feature 20 High-Fidelity UI)
// ============================================================================
export const AdminAlgorithmSettingsCard: React.FC<{
  initialSettings?: FeedAlgorithmSettings;
  initialHealth?: AiTaggingHealthData | null;
  isAdmin?: boolean;
  onSaved?: (saved: FeedAlgorithmSettings) => void;
}> = ({
  initialSettings = {
    hub_feed_base_sort: 'random',
    hub_feed_personalization_pct: 30,
    ai_auto_tagging_enabled: true,
  },
  initialHealth = null,
  isAdmin = true,
  onSaved,
}) => {
  const [settings, setSettings] = useState<FeedAlgorithmSettings>(initialSettings);
  const [persistedSettings, setPersistedSettings] = useState<FeedAlgorithmSettings>(initialSettings);
  const [health, setHealth] = useState<AiTaggingHealthData | null>(initialHealth);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(!initialHealth && isAdmin);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty =
    settings.hub_feed_base_sort !== persistedSettings.hub_feed_base_sort ||
    settings.hub_feed_personalization_pct !== persistedSettings.hub_feed_personalization_pct ||
    settings.ai_auto_tagging_enabled !== persistedSettings.ai_auto_tagging_enabled;

  const fetchHealth = async () => {
    if (!isAdmin) return;
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/analytics/ai-tagging-health');
      if (!res.ok) throw new Error('Impossible de charger le diagnostic IA.');
      const json = await res.json();
      setHealth(json);
    } catch (err: any) {
      setHealthError(err.message || 'Erreur de diagnostic');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    if (!initialHealth && isAdmin) {
      fetchHealth();
    }
  }, [isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Erreur lors de la sauvegarde des paramètres.');

      setPersistedSettings(settings);
      setSaveSuccess(true);
      if (onSaved) onSaved(settings);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Échec de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    setSettings(persistedSettings);
    setSaveError(null);
  };

  const handleTriggerSweep = async () => {
    setIndexing(true);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/analytics/ai-tagging-sweep', { method: 'POST' });
      if (!res.ok) throw new Error("Erreur de déclenchement de l'indexation.");
      await fetchHealth();
    } catch (err: any) {
      setHealthError(err.message);
    } finally {
      setIndexing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl" data-testid="admin-access-denied">
        Accès restreint. Seuls les super-administrateurs peuvent ajuster les paramètres de l&apos;algorithme.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm" data-testid="admin-feed-algorithm-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>⚙️</span> Algorithme & Flux Marketplace Hub
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Contrôlez le mix de personnalisation IA et la stratégie de tri de base pour tous les acheteurs.
          </p>
        </div>

        {isDirty && (
          <div className="flex items-center gap-2" data-testid="unsaved-changes-banner">
            <button
              type="button"
              onClick={handleRevert}
              data-testid="btn-revert-settings"
              className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              data-testid="btn-save-settings"
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div role="status" className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300">
          Paramètres de l&apos;algorithme enregistrés avec succès !
        </div>
      )}

      {saveError && (
        <div role="alert" className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium dark:bg-rose-950/40 dark:text-rose-300">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CONTROL 1: Base Sort Strategy */}
        <div className="space-y-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60" data-testid="section-base-sort">
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Tri de Base du Hub
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Définit l&apos;ordre par défaut des articles non personnalisés sur la page d&apos;accueil du Hub.
          </p>
          <select
            data-testid="select-base-sort"
            value={settings.hub_feed_base_sort}
            onChange={(e) => setSettings({ ...settings, hub_feed_base_sort: e.target.value as HubFeedBaseSort })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
          >
            <option value="random">Mélange aléatoire par session (Session Shuffled)</option>
            <option value="newest">Plus récents en premier (Datetime DESC)</option>
            <option value="alphabetical">Ordre alphabétique (A-Z)</option>
            <option value="best_sellers">Meilleures ventes (Order Volume DESC)</option>
          </select>
        </div>

        {/* CONTROL 2: Personalization Injection Slider */}
        <div className="space-y-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60" data-testid="section-personalization-slider">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Injection de Personnalisation IA
            </label>
            <span
              data-testid="personalization-percentage-badge"
              className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            >
              {settings.hub_feed_personalization_pct}%
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Proportion de produits suggérés selon le profil d&apos;intérêt de l&apos;acheteur (0% à 50%).
          </p>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            data-testid="slider-personalization-pct"
            value={settings.hub_feed_personalization_pct}
            onChange={(e) => setSettings({ ...settings, hub_feed_personalization_pct: Number(e.target.value) })}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          {/* Visual Composition Indicator */}
          <div className="space-y-1 pt-1" data-testid="feed-composition-bar">
            <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${settings.hub_feed_personalization_pct}%` }}
                title={`IA: ${settings.hub_feed_personalization_pct}%`}
              />
              <div
                className="h-full bg-zinc-400 dark:bg-zinc-500 transition-all"
                style={{ width: `${100 - settings.hub_feed_personalization_pct}%` }}
                title={`Tri de Base: ${100 - settings.hub_feed_personalization_pct}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>🤖 {settings.hub_feed_personalization_pct}% Intérêts IA</span>
              <span>📋 {100 - settings.hub_feed_personalization_pct}% Tri Standard</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI AUTO-TAGGING DIAGNOSTIC HEALTH CARD */}
      <section className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-4" data-testid="ai-tagging-health-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>🧠</span> Moniteur Diagnostic Auto-Tagging Gemini Pro
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Génération d&apos;étiquettes cachées d&apos;intérêt pour le moteur de recommandation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span>Auto-Tagging Actif</span>
              <input
                type="checkbox"
                data-testid="toggle-ai-enabled"
                checked={settings.ai_auto_tagging_enabled}
                onChange={(e) => setSettings({ ...settings, ai_auto_tagging_enabled: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>
            <button
              type="button"
              data-testid="btn-trigger-ai-sweep"
              onClick={handleTriggerSweep}
              disabled={indexing || !settings.ai_auto_tagging_enabled}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {indexing ? 'Indexation...' : "⚡ Lancer l'indexation IA"}
            </button>
          </div>
        </div>

        {loadingHealth ? (
          <div className="h-16 bg-zinc-200 dark:bg-zinc-700/50 animate-pulse rounded-xl" data-testid="health-loading" />
        ) : healthError ? (
          <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs" data-testid="health-error">
            {healthError}
          </div>
        ) : health ? (
          <div className="space-y-4" data-testid="ai-health-metrics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <div className="text-[11px] text-zinc-400">Total Produits</div>
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {(health?.total_products ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <div className="text-[11px] text-zinc-400">Produits Étiquetés</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {(health?.tagged_products ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <div className="text-[11px] text-zinc-400">Couverture Tags</div>
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {health.tag_coverage_pct}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <div className="text-[11px] text-zinc-400">Jobs en Attente</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {health.pending_tag_jobs}
                </div>
              </div>
            </div>

            {health.top_tags && health.top_tags.length > 0 && (
              <div className="space-y-1.5" data-testid="top-tags-cloud">
                <div className="text-xs font-semibold text-zinc-500">Top Tags Générés par Gemini Pro:</div>
                <div className="flex flex-wrap gap-1.5">
                  {health.top_tags.map((t) => (
                    <span
                      key={t.tag}
                      className="px-2 py-0.5 rounded-md text-xs font-mono bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    >
                      #{t.tag} <span className="text-[10px] text-zinc-400">({t.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
};

// ============================================================================
// Test Suite: Admin Settings Algorithm (Feature 20 - Tiers 1 to 4)
// ============================================================================
describe('Feature 20: Superadmin Feed Algorithm Settings & AI Tagging (R4)', () => {
  const mockInitialSettings: FeedAlgorithmSettings = {
    hub_feed_base_sort: 'random',
    hub_feed_personalization_pct: 30,
    ai_auto_tagging_enabled: true,
  };

  const mockHealthData: AiTaggingHealthData = {
    total_products: 1250,
    tagged_products: 1180,
    tag_coverage_pct: 94.4,
    pending_tag_jobs: 12,
    top_tags: [
      { tag: 'electronique', count: 320 },
      { tag: 'robotique', count: 210 },
      { tag: 'artisanat', count: 180 },
      { tag: 'mode', count: 140 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // TIER 1: CORE RENDERING & FORM CONTROLS (Coverage >= 5)
  // =========================================================================
  describe('Tier 1: Core Functional & Component Rendering', () => {
    it('T1.1: renders Base Sorting selector with all 4 sorting options', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      const select = screen.getByTestId('select-base-sort') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('random');

      const options = Array.from(select.options).map((o) => o.value);
      expect(options).toEqual(['random', 'newest', 'alphabetical', 'best_sellers']);
    });

    it('T1.2: renders Personalization Percentage Slider with 0-50% range and 30% default', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      const slider = screen.getByTestId('slider-personalization-pct') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('50');
      expect(slider.value).toBe('30');
      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('30%');
    });

    it('T1.3: changing slider updates live percentage badge and visual composition indicator', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      const slider = screen.getByTestId('slider-personalization-pct');
      fireEvent.change(slider, { target: { value: '45' } });

      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('45%');
      expect(screen.getByText('🤖 45% Intérêts IA')).toBeInTheDocument();
      expect(screen.getByText('📋 55% Tri Standard')).toBeInTheDocument();
    });

    it('T1.4: renders AI Diagnostic Health Card with total products, tagged products, coverage %, and queue count', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      expect(screen.getByText(/1[\s,.]?250/)).toBeInTheDocument();
      expect(screen.getByText(/1[\s,.]?180/)).toBeInTheDocument();
      expect(screen.getByText('94.4%')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/#electronique/)).toBeInTheDocument();
    });

    it('T1.5: triggers Save API and persists updated algorithm configuration', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const onSaved = vi.fn();
      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} onSaved={onSaved} />);

      // Modify sort to best_sellers
      fireEvent.change(screen.getByTestId('select-base-sort'), { target: { value: 'best_sellers' } });
      // Modify slider to 40%
      fireEvent.change(screen.getByTestId('slider-personalization-pct'), { target: { value: '40' } });

      // Click save
      const saveBtn = screen.getByTestId('btn-save-settings');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          '/api/pd/admin/settings',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              hub_feed_base_sort: 'best_sellers',
              hub_feed_personalization_pct: 40,
              ai_auto_tagging_enabled: true,
            }),
          })
        );
        expect(onSaved).toHaveBeenCalledWith({
          hub_feed_base_sort: 'best_sellers',
          hub_feed_personalization_pct: 40,
          ai_auto_tagging_enabled: true,
        });
        expect(screen.getByRole('status')).toHaveTextContent('Paramètres de l\'algorithme enregistrés avec succès !');
      });
    });

    it('T1.6: clicking Revert resets form changes back to persisted state', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      fireEvent.change(screen.getByTestId('slider-personalization-pct'), { target: { value: '15' } });
      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('15%');
      expect(screen.getByTestId('unsaved-changes-banner')).toBeInTheDocument();

      const revertBtn = screen.getByTestId('btn-revert-settings');
      fireEvent.click(revertBtn);

      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('30%');
      expect(screen.queryByTestId('unsaved-changes-banner')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY VALUES & ERROR HANDLING (Boundary >= 5)
  // =========================================================================
  describe('Tier 2: Boundary States & Error Handling', () => {
    it('T2.1: handles slider boundary 0% (pure base sort, 0% AI personalization)', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      const slider = screen.getByTestId('slider-personalization-pct');
      fireEvent.change(slider, { target: { value: '0' } });

      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('0%');
      expect(screen.getByText('🤖 0% Intérêts IA')).toBeInTheDocument();
      expect(screen.getByText('📋 100% Tri Standard')).toBeInTheDocument();
    });

    it('T2.2: handles slider boundary 50% (maximum personalization injection cap)', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      const slider = screen.getByTestId('slider-personalization-pct');
      fireEvent.change(slider, { target: { value: '50' } });

      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('50%');
      expect(screen.getByText('🤖 50% Intérêts IA')).toBeInTheDocument();
      expect(screen.getByText('📋 50% Tri Standard')).toBeInTheDocument();
    });

    it('T2.3: handles AI Diagnostic API failure gracefully with fallback message', async () => {
      (fetchWithCsrf as any).mockRejectedValueOnce(new Error('Erreur de diagnostic'));

      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={null} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('health-error')).toHaveTextContent('Erreur de diagnostic');
      });
    });

    it('T2.4: handles 0% coverage and 0 products boundary without division by zero', () => {
      const zeroHealth: AiTaggingHealthData = {
        total_products: 0,
        tagged_products: 0,
        tag_coverage_pct: 0,
        pending_tag_jobs: 0,
        top_tags: [],
      };

      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={zeroHealth} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('T2.5: blocks non-admin users with access denied message', () => {
      render(<AdminAlgorithmSettingsCard isAdmin={false} />);

      expect(screen.getByTestId('admin-access-denied')).toHaveTextContent('Accès restreint.');
      expect(screen.queryByTestId('select-base-sort')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // TIER 3: CROSS-COMPONENT INTERACTIONS
  // =========================================================================
  describe('Tier 3: Cross-Component Interactions & State Sync', () => {
    it('T3.1: toggling Auto-Tagging off disables the manual sweep button and marks settings dirty', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      const sweepBtn = screen.getByTestId('btn-trigger-ai-sweep');
      expect(sweepBtn).not.toBeDisabled();

      const toggle = screen.getByTestId('toggle-ai-enabled');
      fireEvent.click(toggle);

      expect(sweepBtn).toBeDisabled();
      expect(screen.getByTestId('unsaved-changes-banner')).toBeInTheDocument();
    });

    it('T3.2: triggering manual AI sweep invokes sweep endpoint and refreshes health diagnostic', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ...mockHealthData, tagged_products: 1200, tag_coverage_pct: 96.0 }),
      });

      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      const sweepBtn = screen.getByTestId('btn-trigger-ai-sweep');
      fireEvent.click(sweepBtn);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith('/api/pd/admin/analytics/ai-tagging-sweep', { method: 'POST' });
        expect(fetchWithCsrf).toHaveBeenCalledWith('/api/pd/admin/analytics/ai-tagging-health');
      });
    });
  });

  // =========================================================================
  // TIER 4: END-TO-END USER JOURNEY SIMULATION
  // =========================================================================
  describe('Tier 4: E2E User Journey Simulation', () => {
    it('T4.1: simulates full superadmin algorithm tuning journey: check diagnostic -> adjust sorting and slider -> trigger AI sweep -> save settings', async () => {
      // Sweep mock
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });
      // Health refresh mock
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ...mockHealthData, tagged_products: 1220, tag_coverage_pct: 97.6 }),
      });
      // Save settings mock
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      render(<AdminAlgorithmSettingsCard initialSettings={mockInitialSettings} initialHealth={mockHealthData} />);

      // Step 1: Check Diagnostics
      expect(screen.getByText('94.4%')).toBeInTheDocument();

      // Step 2: Trigger AI sweep
      fireEvent.click(screen.getByTestId('btn-trigger-ai-sweep'));

      // Step 3: Adjust Sort & Personalization
      fireEvent.change(screen.getByTestId('select-base-sort'), { target: { value: 'best_sellers' } });
      fireEvent.change(screen.getByTestId('slider-personalization-pct'), { target: { value: '35' } });

      // Step 4: Save
      fireEvent.click(screen.getByTestId('btn-save-settings'));

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Paramètres de l\'algorithme enregistrés avec succès !');
      });
    });
  });
});
