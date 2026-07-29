'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import {
  Radar,
  ShieldAlert,
  AlertTriangle,
  HeartPulse,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Gavel,
  Key,
  Ban,
  Download,
  ArrowLeft,
  Mail,
  Building2,
  Globe,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface FraudRadarItem {
  id: string;
  store_id: string;
  user_id: string;
  store_name: string;
  store_subdomain: string;
  seller_email: string;
  target_plan: string;
  amount: number | string;
  gateway: string;
  status: string;
  created_at: string;
  health_scorecard: {
    score: number;
    level: string;
    risk_flags: string[];
  };
}

export default function DedicatedFraudRadarPage() {
  const { t, dir } = useLocale();
  const [radarList, setRadarList] = useState<FraudRadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const fetchRadar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/fraud-radar', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRadarList(data.radar || []);
      } else {
        setError('Failed to fetch fraud radar list');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRadar();
  }, [fetchRadar]);

  const handleFreezeStore = async (storeId: string, storeName: string) => {
    if (!confirm(`Geler immédiatement l'abonnement et les accès de la boutique ${storeName} ?`)) return;
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ store_id: storeId }),
      });
      if (res.ok) {
        setSuccess(`🛡️ Boutique ${storeName} gelée avec succès pour prévention de fraude !`);
        fetchRadar();
      }
    } catch {
      setError('Erreur de gel boutique');
    }
  };

  const handleGenerateMagicLink = async (intentId: string) => {
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intent_id: intentId }),
      });
      if (res.ok) {
        const data = await res.json();
        navigator.clipboard.writeText(data.magic_url);
        setSuccess('🎉 Magic Link de vérification copié dans le presse-papier !');
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch {
      setError('Erreur Magic Link');
    }
  };

  const filteredRadar = radarList.filter((item) => {
    const matchesSearch =
      (item.store_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.seller_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.store_subdomain || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (riskFilter === 'critical') return matchesSearch && item.health_scorecard.score < 50;
    if (riskFilter === 'at_risk') return matchesSearch && item.health_scorecard.score >= 50 && item.health_scorecard.score < 80;
    if (riskFilter === 'disposable') return matchesSearch && (item.health_scorecard.risk_flags || []).some((f) => f.includes('Disposable'));
    return matchesSearch;
  });

  const exportRiskReport = () => {
    const headers = ['Store Name', 'Subdomain', 'Email', 'Plan', 'Amount TND', 'Risk Score', 'Risk Flags', 'Date'];
    const rows = filteredRadar.map((item) => [
      `"${item.store_name}"`,
      `"${item.store_subdomain}"`,
      `"${item.seller_email}"`,
      `"${item.target_plan}"`,
      `"${item.amount}"`,
      `"${item.health_scorecard.score}"`,
      `"${(item.health_scorecard.risk_flags || []).join('; ')}"`,
      `"${new Date(item.created_at).toISOString()}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fraud_radar_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div dir={dir} className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link href="/subscription-orders" className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Radar className="w-8 h-8 text-red-600 animate-pulse" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Fraud & Chargeback Early Warning Radar
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Surveillance proactive des comptes à haut risque, e-mails jetables et tentatives de chargebacks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportRiskReport} className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm">
            <Download className="w-4 h-4" /> Export CSV Report
          </button>
          <button onClick={fetchRadar} className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 flex items-center gap-1.5 shadow-sm">
            <RefreshCw className="w-4 h-4" /> Refresh Radar
          </button>
        </div>
      </div>

      {/* Summary Risk Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-1">
          <p className="text-red-600 font-bold uppercase text-[10px] tracking-wider">Critical Risk (&lt; 50/100)</p>
          <p className="text-2xl font-black text-red-700 dark:text-red-300">
            {radarList.filter((i) => i.health_scorecard.score < 50).length} <span className="text-xs font-normal text-slate-400">accounts</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
          <p className="text-amber-600 font-bold uppercase text-[10px] tracking-wider">At Risk (50-79/100)</p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
            {radarList.filter((i) => i.health_scorecard.score >= 50 && i.health_scorecard.score < 80).length} <span className="text-xs font-normal text-slate-400">accounts</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-1">
          <p className="text-purple-600 font-bold uppercase text-[10px] tracking-wider">Disposable Domains</p>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-300">
            {radarList.filter((i) => (i.health_scorecard.risk_flags || []).some((f) => f.includes('Disposable'))).length} <span className="text-xs font-normal text-slate-400">emails</span>
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Total Scanned Orders</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{radarList.length} <span className="text-xs font-normal text-slate-400">orders</span></p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-2xl">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs font-medium rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par boutique, e-mail ou sous-domaine..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none w-full sm:w-auto"
          >
            <option value="all">Tous les Niveaux de Risque</option>
            <option value="critical">🔴 Risque Critique (&lt; 50/100)</option>
            <option value="at_risk">🟠 Risque Modéré (50-79/100)</option>
            <option value="disposable">📧 E-mails Jetables (Tempmail/Yopmail)</option>
          </select>
        </div>
      </div>

      {/* Radar Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium">Analyse du radar anti-fraude en cours...</div>
      ) : filteredRadar.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <ShieldAlert className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="font-bold text-slate-700 dark:text-slate-300">Aucune menace ou compte suspect détecté !</p>
          <p className="text-xs text-slate-400">Tous les comptes analysés respectent les critères de sécurité.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRadar.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-red-400 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">{item.store_name || 'N/A'}</h3>
                  <p className="text-slate-400 text-xs font-mono">{item.store_subdomain || 'unknown'}.pandamarket.tn</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${item.health_scorecard.level === 'critical' ? 'bg-red-100 text-red-700' : item.health_scorecard.level === 'at_risk' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} flex items-center gap-1`}>
                  <HeartPulse className="w-3 h-3" /> Score {item.health_scorecard.score}/100
                </span>
              </div>

              <div className="space-y-1.5 text-xs bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-[11px] truncate">{item.seller_email}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Plan: <strong className="uppercase text-slate-800 dark:text-slate-200">{item.target_plan}</strong></span>
                  <span>Montant: <strong className="text-red-600">{Number(item.amount).toFixed(0)} TND</strong></span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Drapeaux de Risque Détectés :
                </p>
                <div className="space-y-1">
                  {(item.health_scorecard.risk_flags || []).map((flag, idx) => (
                    <div key={idx} className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 text-[11px] font-bold border border-red-200 dark:border-red-900">
                      • {flag}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleGenerateMagicLink(item.id)}
                  className="flex-1 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold rounded-xl text-xs hover:bg-purple-100 flex items-center justify-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" /> Magic Link
                </button>
                <button
                  onClick={() => handleFreezeStore(item.store_id, item.store_name)}
                  className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 flex items-center justify-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5" /> Geler Accès
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
