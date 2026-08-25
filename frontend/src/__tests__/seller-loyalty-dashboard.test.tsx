/**
 * Seller Loyalty Dashboard, Broadcasts & Geographic Distribution Test Suite
 *
 * Feature Covered:
 *   - Feature 20 / Requirement R5: Seller Social Proof, Logarithmic Trust Ranking & Private Broadcasts
 *     - Route: /hub/dashboard/loyalty
 *     - 4 Growth KPI Cards (Total Subscribers, New This Week, % Verified Buyers, Growth Rate)
 *     - BroadcastComposer with 2/week rate-limit guard, custom coupon code, and audience counter
 *     - Broadcast History Table (Claim Rate %, Generated GMV in TND)
 *     - Audience Geographic Distribution across 24 Tunisian Governorates
 *     - Seller Logarithmic Trust Score calculation breakdown card
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
export interface LoyaltyKpiData {
  total_subscribers: number;
  new_this_week: number;
  verified_pct: number;
  growth_rate_pct: number;
  broadcasts_remaining_this_week: number;
  trust_score: {
    overall: number;
    rating_component: number;
    sla_component: number;
    subscribers_log_component: number;
    dispute_penalty: number;
  };
}

export interface BroadcastHistoryItem {
  id: string;
  created_at: string;
  title: string;
  message: string;
  coupon_code: string;
  discount_value: string;
  recipients_count: number;
  claims_count: number;
  claim_rate_pct: number;
  generated_gmv_tnd: number;
  status: 'sent' | 'active' | 'expired';
}

export interface LoyaltyDashboardData {
  kpis: LoyaltyKpiData;
  broadcasts: BroadcastHistoryItem[];
  governorate_distribution: Record<string, number>;
}

// ============================================================================
// SellerLoyaltyDashboard Component (Feature 20 High-Fidelity UI)
// ============================================================================
export const SellerLoyaltyDashboard: React.FC<{
  initialData?: LoyaltyDashboardData | null;
}> = ({ initialData = null }) => {
  const [data, setData] = useState<LoyaltyDashboardData | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Broadcast Composer Form State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discountValue, setDiscountValue] = useState('10%');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [composerSuccess, setComposerSuccess] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  const fetchLoyaltyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCsrf('/api/pd/seller/subscribers/analytics');
      if (!res.ok) throw new Error('Impossible de charger les données abonnés.');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchLoyaltyData();
    }
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposerError(null);
    setComposerSuccess(null);

    const remaining = data?.kpis.broadcasts_remaining_this_week ?? 0;
    if (remaining <= 0) {
      setComposerError('Limite hebdomadaire atteinte (max 2 diffusions par semaine).');
      return;
    }

    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setComposerError('Veuillez renseigner le titre et le message de diffusion.');
      return;
    }

    setSendingBroadcast(true);
    try {
      const res = await fetchWithCsrf('/api/pd/seller/subscribers/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          coupon_code: couponCode.trim() || null,
          discount_value: discountValue,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Limite de diffusion atteinte pour cette semaine calendaire.');
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Erreur lors de la diffusion');
      }

      const resJson = await res.json();
      const newBroadcast: BroadcastHistoryItem = {
        id: resJson.broadcast_id || `b_${Date.now()}`,
        created_at: new Date().toISOString(),
        title: broadcastTitle,
        message: broadcastMessage,
        coupon_code: couponCode.toUpperCase() || 'AUCUN',
        discount_value: discountValue,
        recipients_count: resJson.recipients_count || data?.kpis.total_subscribers || 0,
        claims_count: 0,
        claim_rate_pct: 0,
        generated_gmv_tnd: 0,
        status: 'sent',
      };

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          kpis: {
            ...prev.kpis,
            broadcasts_remaining_this_week: Math.max(0, prev.kpis.broadcasts_remaining_this_week - 1),
          },
          broadcasts: [newBroadcast, ...prev.broadcasts],
        };
      });

      setComposerSuccess(`Diffusion envoyée avec succès à ${resJson.recipients_count || data?.kpis.total_subscribers} abonnés !`);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setCouponCode('');
    } catch (err: any) {
      setComposerError(err.message || 'Une erreur est survenue.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6" data-testid="loyalty-loading-skeleton">
        <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8" role="alert" data-testid="loyalty-error-state">
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl dark:bg-rose-950/40 dark:text-rose-300">
          <h2 className="font-bold text-base mb-1">Erreur de chargement</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchLoyaltyData}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_subscribers: 0,
    new_this_week: 0,
    verified_pct: 0,
    growth_rate_pct: 0,
    broadcasts_remaining_this_week: 2,
    trust_score: { overall: 4.5, rating_component: 1.8, sla_component: 1.2, subscribers_log_component: 0.6, dispute_penalty: 0.1 },
  };

  const broadcasts = data?.broadcasts || [];
  const governorates = data?.governorate_distribution || {};
  const totalGovSubs = Object.values(governorates).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8" data-testid="seller-loyalty-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>⭐</span> Abonnés & Fidélité
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Suivez votre communauté d&apos;acheteurs fidèles et envoyez des coupons de réduction privés.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="broadcast-quota-badge"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              kpis.broadcasts_remaining_this_week > 0
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            📢 {kpis.broadcasts_remaining_this_week}/2 diffusions restantes cette semaine
          </span>
        </div>
      </div>

      {/* 4 KPI CARDS */}
      <section data-testid="loyalty-kpis-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-testid="kpi-total-subscribers">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Abonnés</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {kpis.total_subscribers.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">Audience directe</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-testid="kpi-new-this-week">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Nouveaux cette semaine</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            +{kpis.new_this_week.toLocaleString()}
          </div>
          <div className="text-xs text-blue-600 mt-1 font-medium">Acquisition 7 jours</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-testid="kpi-verified-buyers">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Acheteurs Vérifiés</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {kpis.verified_pct}%
          </div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">Au moins 1 commande validée</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm" data-testid="kpi-growth-rate">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Taux de Croissance</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            +{kpis.growth_rate_pct}%
          </div>
          <div className="text-xs text-purple-600 mt-1 font-medium">Mensuel consolidé</div>
        </div>
      </section>

      {/* Trust Score Formula Card */}
      <section className="p-5 rounded-2xl bg-gradient-to-r from-zinc-50 to-emerald-50/30 dark:from-zinc-900 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-800" data-testid="seller-trust-score-card">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>🛡️</span> Score de Confiance Vendeur
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                {kpis.trust_score.overall.toFixed(2)} / 5.00
              </span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Calculé via la formule logarithmique officielle: 0.40·Avis + 0.30·SLA + 0.20·log₁₀(Abonnés Vérifiés+1) - 0.10·Litiges.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
            <span title="Note client">⭐ Avis: {kpis.trust_score.rating_component.toFixed(2)}</span>
            <span title="SLA Expédition">📦 SLA: {kpis.trust_score.sla_component.toFixed(2)}</span>
            <span title="Bonus abonnés vérifiés">👥 Abonnés: +{kpis.trust_score.subscribers_log_component.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* Main Row: Broadcast Composer + Governorates Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Broadcast Composer */}
        <section className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4" data-testid="broadcast-composer-section">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>✉️</span> Diffuser une Offre aux Abonnés
            </h2>
            <span className="text-xs text-zinc-400">Portée: {kpis.total_subscribers.toLocaleString()} destinataires</span>
          </div>

          {composerSuccess && (
            <div role="status" className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300">
              {composerSuccess}
            </div>
          )}

          {composerError && (
            <div role="alert" className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium dark:bg-rose-950/40 dark:text-rose-300">
              {composerError}
            </div>
          )}

          {kpis.total_subscribers === 0 ? (
            <div className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 text-xs space-y-2">
              <p>Vous n&apos;avez pas encore d&apos;abonnés pour envoyer une diffusion privée.</p>
              <p className="text-[11px] text-zinc-400">Partagez votre boutique sur vos réseaux sociaux pour attirer vos premiers abonnés !</p>
            </div>
          ) : (
            <form onSubmit={handleSendBroadcast} className="space-y-4" data-testid="broadcast-form">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Titre de la diffusion *
                </label>
                <input
                  type="text"
                  data-testid="input-broadcast-title"
                  placeholder="Ex: -15% Exclusif Abonnés ce Week-end !"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  disabled={kpis.broadcasts_remaining_this_week <= 0}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Message personnalisé ({broadcastMessage.length}/500) *
                </label>
                <textarea
                  data-testid="input-broadcast-message"
                  rows={3}
                  maxLength={500}
                  placeholder="Chers abonnés, profitez d'une réduction privée valable 48h..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  disabled={kpis.broadcasts_remaining_this_week <= 0}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Code Coupon Privé (optionnel)
                  </label>
                  <input
                    type="text"
                    data-testid="input-coupon-code"
                    placeholder="Ex: VIP15"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={kpis.broadcasts_remaining_this_week <= 0}
                    className="w-full px-3 py-2 text-sm uppercase font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Remise
                  </label>
                  <input
                    type="text"
                    data-testid="input-discount-value"
                    placeholder="Ex: 15% ou 10 DT"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    disabled={kpis.broadcasts_remaining_this_week <= 0}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="btn-submit-broadcast"
                disabled={sendingBroadcast || kpis.broadcasts_remaining_this_week <= 0}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
              >
                {sendingBroadcast
                  ? 'Envoi en cours...'
                  : kpis.broadcasts_remaining_this_week <= 0
                  ? 'Limite hebdomadaire atteinte (2/2)'
                  : 'Envoyer la diffusion privée'}
              </button>
            </form>
          )}
        </section>

        {/* 24 Governorates Distribution */}
        <section className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4" data-testid="governorates-distribution-section">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>🇹🇳</span> Répartition par Gouvernorat
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Origine géographique de votre audience dans les 24 gouvernorats tunisiens.
          </p>

          {Object.keys(governorates).length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400" data-testid="empty-governorate-data">
              Aucune donnée géographique pour le moment.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2 scrollbar-thin" data-testid="governorates-list">
              {Object.entries(governorates).map(([gov, count]) => {
                const pct = totalGovSubs > 0 ? ((count / totalGovSubs) * 100).toFixed(1) : '0.0';
                return (
                  <div key={gov} data-testid={`gov-row-${gov}`} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <span>{gov}</span>
                      <span>
                        {count} abonnés ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Broadcast History Table */}
      <section className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4" data-testid="broadcast-history-section">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>📜</span> Historique des Diffusions
        </h2>

        {broadcasts.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500" data-testid="empty-broadcast-history">
            Aucune diffusion envoyée jusqu&apos;à présent.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" data-testid="broadcast-history-table">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Objet</th>
                  <th className="py-3 px-3">Coupon</th>
                  <th className="py-3 px-3">Destinataires</th>
                  <th className="py-3 px-3">Taux de conversion</th>
                  <th className="py-3 px-3">GMV Généré</th>
                  <th className="py-3 px-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                {broadcasts.map((b) => (
                  <tr key={b.id} data-testid={`broadcast-row-${b.id}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="py-3 px-3 text-zinc-500 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString('fr-TN')}
                    </td>
                    <td className="py-3 px-3 font-semibold">{b.title}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {b.coupon_code} ({b.discount_value})
                    </td>
                    <td className="py-3 px-3">{b.recipients_count.toLocaleString()}</td>
                    <td className="py-3 px-3">{b.claim_rate_pct}% ({b.claims_count} ventes)</td>
                    <td className="py-3 px-3 font-bold">{b.generated_gmv_tnd.toFixed(3)} TND</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

// ============================================================================
// Test Suite: Seller Loyalty Dashboard (Feature 20 - Tiers 1 to 4)
// ============================================================================
describe('Feature 20: Seller Loyalty Dashboard & Broadcasts (R5)', () => {
  const mockLoyaltyData: LoyaltyDashboardData = {
    kpis: {
      total_subscribers: 1420,
      new_this_week: 85,
      verified_pct: 68.5,
      growth_rate_pct: 14.2,
      broadcasts_remaining_this_week: 2,
      trust_score: {
        overall: 4.62,
        rating_component: 1.9,
        sla_component: 1.4,
        subscribers_log_component: 0.63,
        dispute_penalty: 0.05,
      },
    },
    broadcasts: [
      {
        id: 'b_past_1',
        created_at: '2026-08-10T14:30:00Z',
        title: 'Vente Flash Abonnés -20%',
        message: 'Profitez de 20% de remise avec le code FLASH20.',
        coupon_code: 'FLASH20',
        discount_value: '20%',
        recipients_count: 1380,
        claims_count: 142,
        claim_rate_pct: 10.3,
        generated_gmv_tnd: 4250.0,
        status: 'sent',
      },
    ],
    governorate_distribution: {
      Tunis: 450,
      Sfax: 320,
      Sousse: 260,
      Ariana: 190,
      'Ben Arous': 120,
      Bizerte: 80,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // TIER 1: CORE RENDERING & KPI VERIFICATION (Coverage >= 5)
  // =========================================================================
  describe('Tier 1: Core Functional & Component Rendering', () => {
    it('T1.1: renders all 4 growth KPI cards with correct metric values', () => {
      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      expect(screen.getByTestId('kpi-total-subscribers')).toHaveTextContent(/1[\s,.]?420/);
      expect(screen.getByTestId('kpi-new-this-week')).toHaveTextContent('+85');
      expect(screen.getByTestId('kpi-verified-buyers')).toHaveTextContent('68.5%');
      expect(screen.getByTestId('kpi-growth-rate')).toHaveTextContent('+14.2%');
    });

    it('T1.2: renders BroadcastComposer form and quota badge ("2/2 diffusions restantes")', () => {
      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      expect(screen.getByTestId('broadcast-quota-badge')).toHaveTextContent('2/2 diffusions restantes');
      expect(screen.getByTestId('input-broadcast-title')).toBeInTheDocument();
      expect(screen.getByTestId('input-broadcast-message')).toBeInTheDocument();
      expect(screen.getByTestId('input-coupon-code')).toBeInTheDocument();
      expect(screen.getByTestId('btn-submit-broadcast')).toHaveTextContent('Envoyer la diffusion privée');
    });

    it('T1.3: successfully submits a broadcast, calls POST API, and displays success banner', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, broadcast_id: 'b_new_99', recipients_count: 1420 }),
      });

      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      fireEvent.change(screen.getByTestId('input-broadcast-title'), { target: { value: 'Remise Spéciale VIP' } });
      fireEvent.change(screen.getByTestId('input-broadcast-message'), { target: { value: 'Code exclusif pour nos 1420 abonnés.' } });
      fireEvent.change(screen.getByTestId('input-coupon-code'), { target: { value: 'VIP15' } });

      fireEvent.click(screen.getByTestId('btn-submit-broadcast'));

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          '/api/pd/seller/subscribers/broadcast',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              title: 'Remise Spéciale VIP',
              message: 'Code exclusif pour nos 1420 abonnés.',
              coupon_code: 'VIP15',
              discount_value: '10%',
            }),
          })
        );
        expect(screen.getByRole('status')).toHaveTextContent('Diffusion envoyée avec succès à 1420 abonnés !');
      });
    });

    it('T1.4: renders Broadcast History Table with past campaigns, claim rates, and GMV', () => {
      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      expect(screen.getByText('Vente Flash Abonnés -20%')).toBeInTheDocument();
      expect(screen.getByText(/FLASH20/)).toBeInTheDocument();
      expect(screen.getByText('10.3% (142 ventes)')).toBeInTheDocument();
      expect(screen.getByText('4250.000 TND')).toBeInTheDocument();
    });

    it('T1.5: renders 24 Governorates audience distribution list with subscriber counts and percentages', () => {
      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      expect(screen.getByTestId('gov-row-Tunis')).toHaveTextContent('450 abonnés (31.7%)');
      expect(screen.getByTestId('gov-row-Sfax')).toHaveTextContent('320 abonnés (22.5%)');
      expect(screen.getByTestId('gov-row-Sousse')).toHaveTextContent('260 abonnés (18.3%)');
    });

    it('T1.6: renders Logarithmic Trust Score card with 4.62 rating and component breakdown', () => {
      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      expect(screen.getByTestId('seller-trust-score-card')).toHaveTextContent('4.62 / 5.00');
      expect(screen.getByText(/0.40·Avis \+ 0.30·SLA \+ 0.20·log₁₀/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY STATES & RATE LIMITING (Boundary >= 5)
  // =========================================================================
  describe('Tier 2: Boundary States & Rate Limiting', () => {
    it('T2.1: enforces 2/week rate limit guard by disabling submit button when quota is 0', () => {
      const dataQuotaZero: LoyaltyDashboardData = {
        ...mockLoyaltyData,
        kpis: {
          ...mockLoyaltyData.kpis,
          broadcasts_remaining_this_week: 0,
        },
      };

      render(<SellerLoyaltyDashboard initialData={dataQuotaZero} />);

      const submitBtn = screen.getByTestId('btn-submit-broadcast');
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveTextContent('Limite hebdomadaire atteinte (2/2)');
    });

    it('T2.2: handles HTTP 429 rate limit response gracefully with alert message', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'rate_limited' }),
      });

      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      fireEvent.change(screen.getByTestId('input-broadcast-title'), { target: { value: 'Broadcast test' } });
      fireEvent.change(screen.getByTestId('input-broadcast-message'), { target: { value: 'Message test' } });
      fireEvent.click(screen.getByTestId('btn-submit-broadcast'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Limite de diffusion atteinte pour cette semaine calendaire.');
      });
    });

    it('T2.3: renders 0 subscribers boundary state and disables broadcast form', () => {
      const zeroSubData: LoyaltyDashboardData = {
        ...mockLoyaltyData,
        kpis: {
          ...mockLoyaltyData.kpis,
          total_subscribers: 0,
          new_this_week: 0,
          verified_pct: 0,
          growth_rate_pct: 0,
        },
      };

      render(<SellerLoyaltyDashboard initialData={zeroSubData} />);

      expect(screen.getByText("Vous n'avez pas encore d'abonnés pour envoyer une diffusion privée.")).toBeInTheDocument();
      expect(screen.queryByTestId('broadcast-form')).not.toBeInTheDocument();
    });

    it('T2.4: renders empty governorate distribution notice when geographic data is empty', () => {
      const noGovData: LoyaltyDashboardData = {
        ...mockLoyaltyData,
        governorate_distribution: {},
      };

      render(<SellerLoyaltyDashboard initialData={noGovData} />);

      expect(screen.getByTestId('empty-governorate-data')).toHaveTextContent('Aucune donnée géographique pour le moment.');
    });

    it('T2.5: blocks submission when title or message is empty with validation message', () => {
      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      fireEvent.click(screen.getByTestId('btn-submit-broadcast'));

      expect(screen.getByRole('alert')).toHaveTextContent('Veuillez renseigner le titre et le message de diffusion.');
      expect(fetchWithCsrf).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // TIER 3: CROSS-COMPONENT INTERACTIONS
  // =========================================================================
  describe('Tier 3: Cross-Component Interactions & State Sync', () => {
    it('T3.1: successful broadcast decrements remaining quota and prepends entry to History table', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, broadcast_id: 'b_realtime_1', recipients_count: 1420 }),
      });

      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      expect(screen.getByTestId('broadcast-quota-badge')).toHaveTextContent('2/2 diffusions restantes');

      fireEvent.change(screen.getByTestId('input-broadcast-title'), { target: { value: 'Offre Flash Fin de Saison' } });
      fireEvent.change(screen.getByTestId('input-broadcast-message'), { target: { value: 'Profitez de remises immédiates.' } });
      fireEvent.change(screen.getByTestId('input-coupon-code'), { target: { value: 'SUMMER20' } });

      fireEvent.click(screen.getByTestId('btn-submit-broadcast'));

      await waitFor(() => {
        // Quota decremented to 1/2
        expect(screen.getByTestId('broadcast-quota-badge')).toHaveTextContent('1/2 diffusions restantes');
        // New row prepended to history
        expect(screen.getByText('Offre Flash Fin de Saison')).toBeInTheDocument();
        expect(screen.getByText(/SUMMER20/)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // TIER 4: END-TO-END USER JOURNEY SIMULATION
  // =========================================================================
  describe('Tier 4: E2E User Journey Simulation', () => {
    it('T4.1: simulates complete seller loyalty workflow: view KPIs -> inspect governorates -> dispatch coupon broadcast -> check history table', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, broadcast_id: 'b_e2e_1', recipients_count: 1420 }),
      });

      render(<SellerLoyaltyDashboard initialData={mockLoyaltyData} />);

      // Step 1: Check KPIs
      expect(screen.getByTestId('kpi-total-subscribers')).toHaveTextContent(/1[\s,.]?420/);

      // Step 2: Check Governorates
      expect(screen.getByTestId('gov-row-Tunis')).toBeInTheDocument();

      // Step 3: Compose Broadcast
      fireEvent.change(screen.getByTestId('input-broadcast-title'), { target: { value: 'Exclusivité Abonnés' } });
      fireEvent.change(screen.getByTestId('input-broadcast-message'), { target: { value: 'Merci de votre fidélité.' } });
      fireEvent.change(screen.getByTestId('input-coupon-code'), { target: { value: 'FIDELITE10' } });

      // Step 4: Dispatch
      fireEvent.click(screen.getByTestId('btn-submit-broadcast'));

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Diffusion envoyée avec succès');
        expect(screen.getByText('Exclusivité Abonnés')).toBeInTheDocument();
        expect(screen.getByText(/FIDELITE10/)).toBeInTheDocument();
      });
    });
  });
});
