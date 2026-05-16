'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  Coins,
  Cpu,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  TrendingUp,
  Trash2,
  WalletCards,
  XCircle,
} from 'lucide-react';

interface AiStats {
  total_jobs: number;
  total_tokens_consumed: number;
  jobs_today: number;
  tokens_today: number;
  compression_jobs: number;
  seo_jobs: number;
  page_copy_jobs: number;
  failed_jobs: number;
  processing_jobs: number;
  queued_jobs: number;
  estimated_cost_tnd: number;
  credits: {
    active_wallets: number;
    unlimited_wallets: number;
    finite_tokens_remaining: number;
    tokens_used: number;
  };
  by_type: {
    type: string;
    count: number;
    tokens: number;
  }[];
  by_status: {
    status: string;
    count: number;
  }[];
  recent_failures: {
    id: string;
    store_id: string;
    store_name: string;
    type: string;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
  }[];
  top_consumers: {
    store_id: string;
    store_name: string;
    tokens_used: number;
    job_count: number;
  }[];
  daily_usage: {
    date: string;
    tokens: number;
    jobs: number;
  }[];
}

type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom';
type AiJobType = 'image_compression' | 'seo_generation' | 'page_copy' | 'product_description';

interface AiProviderConfig {
  id: string;
  provider: AiProvider;
  label: string;
  model: string;
  base_url: string | null;
  api_key_set: boolean;
  is_enabled: boolean;
  is_default: boolean;
  priority: number;
}

interface AiPricing {
  job_type: AiJobType;
  tokens_required: number;
}

const DEFAULT_STATS: AiStats = {
  total_jobs: 0,
  total_tokens_consumed: 0,
  jobs_today: 0,
  tokens_today: 0,
  compression_jobs: 0,
  seo_jobs: 0,
  page_copy_jobs: 0,
  failed_jobs: 0,
  processing_jobs: 0,
  queued_jobs: 0,
  estimated_cost_tnd: 0,
  credits: {
    active_wallets: 0,
    unlimited_wallets: 0,
    finite_tokens_remaining: 0,
    tokens_used: 0,
  },
  by_type: [],
  by_status: [],
  recent_failures: [],
  top_consumers: [],
  daily_usage: [],
};

const typeLabels: Record<string, string> = {
  image_compression: 'Compression image',
  seo_generation: 'SEO produit',
  page_copy: 'Copy page',
  product_description: 'Description produit',
};

const providerLabels: Record<AiProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  claude: 'Claude',
  custom: 'Custom',
};

const emptyProviderForm = {
  id: '',
  provider: 'gemini' as AiProvider,
  label: '',
  model: 'gemini-1.5-flash',
  base_url: '',
  api_key: '',
  is_enabled: true,
  is_default: false,
  priority: 100,
};

const statusLabels: Record<string, string> = {
  queued: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
};

function statusClass(status: string) {
  if (status === 'completed') return 'bg-green-50 text-green-700 ring-green-100';
  if (status === 'failed') return 'bg-red-50 text-red-700 ring-red-100';
  if (status === 'processing') return 'bg-amber-50 text-amber-700 ring-amber-100';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-TN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AiCostsDashboard() {
  const [stats, setStats] = useState<AiStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [configMessage, setConfigMessage] = useState('');
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [pricing, setPricing] = useState<AiPricing[]>([]);
  const [providerForm, setProviderForm] = useState({ ...emptyProviderForm });
  const [savingConfig, setSavingConfig] = useState(false);

  const maxDailyTokens = useMemo(
    () => Math.max(...stats.daily_usage.map((day) => day.tokens), 1),
    [stats.daily_usage],
  );

  const totalActiveJobs = stats.processing_jobs + stats.queued_jobs;

  const fetchConfig = useCallback(async () => {
    const res = await fetchWithCsrf('/api/pd/admin/ai-config', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || 'Impossible de charger la configuration IA');
    setProviders(Array.isArray(data.providers) ? data.providers : []);
    setPricing(Array.isArray(data.pricing) ? data.pricing : []);
  }, []);

  const fetchStats = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/ai-stats', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Impossible de charger les statistiques IA');
      setStats({
        ...DEFAULT_STATS,
        ...data,
        credits: { ...DEFAULT_STATS.credits, ...(data.credits || {}) },
        by_type: Array.isArray(data.by_type) ? data.by_type : [],
        by_status: Array.isArray(data.by_status) ? data.by_status : [],
        recent_failures: Array.isArray(data.recent_failures) ? data.recent_failures : [],
        top_consumers: Array.isArray(data.top_consumers) ? data.top_consumers : [],
        daily_usage: Array.isArray(data.daily_usage) ? data.daily_usage : [],
      });
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchConfig]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const editProvider = (provider: AiProviderConfig) => {
    setProviderForm({
      id: provider.id,
      provider: provider.provider,
      label: provider.label,
      model: provider.model,
      base_url: provider.base_url || '',
      api_key: '',
      is_enabled: provider.is_enabled,
      is_default: provider.is_default,
      priority: provider.priority,
    });
    setConfigMessage('');
  };

  const resetProviderForm = () => {
    setProviderForm({ ...emptyProviderForm });
    setConfigMessage('');
  };

  const saveProvider = async () => {
    setSavingConfig(true);
    setError('');
    setConfigMessage('');
    try {
      const res = await fetchWithCsrf(
        providerForm.id ? `/api/pd/admin/ai-providers/${encodeURIComponent(providerForm.id)}` : '/api/pd/admin/ai-providers',
        {
          method: providerForm.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            provider: providerForm.provider,
            label: providerForm.label.trim(),
            model: providerForm.model.trim(),
            base_url: providerForm.base_url.trim() || undefined,
            api_key: providerForm.api_key.trim() || undefined,
            is_enabled: providerForm.is_enabled,
            is_default: providerForm.is_default,
            priority: Number(providerForm.priority),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Sauvegarde fournisseur impossible');
      await fetchConfig();
      resetProviderForm();
      setConfigMessage('Fournisseur IA sauvegardé.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingConfig(false);
    }
  };

  const deleteProvider = async (id: string) => {
    setSavingConfig(true);
    setError('');
    setConfigMessage('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/ai-providers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Suppression impossible');
      await fetchConfig();
      if (providerForm.id === id) resetProviderForm();
      setConfigMessage('Fournisseur IA supprimé.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingConfig(false);
    }
  };

  const savePricing = async () => {
    setSavingConfig(true);
    setError('');
    setConfigMessage('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/ai-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prices: pricing }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Sauvegarde des prix IA impossible');
      setPricing(Array.isArray(data.pricing) ? data.pricing : pricing);
      setConfigMessage('Prix IA sauvegardés.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingConfig(false);
    }
  };

  const statCards = [
    { label: 'Total AI Jobs', value: stats.total_jobs.toLocaleString(), icon: Cpu, color: 'text-[#B91C1C] bg-amber-50' },
    { label: 'Tokens Consumed', value: stats.total_tokens_consumed.toLocaleString(), icon: Coins, color: 'text-[#B91C1C] bg-[#B91C1C]/10' },
    { label: 'Tokens Today', value: stats.tokens_today.toLocaleString(), icon: TrendingUp, color: 'text-amber-700 bg-amber-50' },
    { label: 'Est. API Cost', value: `${stats.estimated_cost_tnd.toFixed(3)} TND`, icon: Sparkles, color: 'text-red-600 bg-red-50' },
    { label: 'Compression Jobs', value: stats.compression_jobs.toLocaleString(), icon: ImageIcon, color: 'text-[#7F1D1D] bg-red-50' },
    { label: 'SEO Jobs', value: stats.seo_jobs.toLocaleString(), icon: FileText, color: 'text-amber-700 bg-amber-50' },
    { label: 'Page Copy Jobs', value: stats.page_copy_jobs.toLocaleString(), icon: Sparkles, color: 'text-[#B91C1C] bg-amber-50' },
    { label: 'Active Queue', value: totalActiveJobs.toLocaleString(), icon: Clock3, color: 'text-amber-700 bg-amber-50' },
    { label: 'Failed Jobs', value: stats.failed_jobs.toLocaleString(), icon: XCircle, color: 'text-red-700 bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
              <Sparkles className="h-6 w-6 text-amber-100" />
            </div>
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-amber-100">
                Superadmin AI governance
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight">AI Cost Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Monitor AI usage, queue health, failed jobs, wallet exposure and estimated platform cost.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchStats(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}
      {configMessage && (
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">
          {configMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5 xl:col-span-2">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-950">AI Providers</h2>
              <p className="mt-1 text-sm font-semibold text-gray-500">
                Configure platform API keys, default provider and fallback priority.
              </p>
            </div>
            <button
              type="button"
              onClick={resetProviderForm}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              New provider
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <input
              value={providerForm.label}
              onChange={(e) => setProviderForm((current) => ({ ...current, label: e.target.value }))}
              placeholder="Label"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <select
              value={providerForm.provider}
              onChange={(e) => setProviderForm((current) => ({ ...current, provider: e.target.value as AiProvider }))}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            >
              {Object.entries(providerLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              value={providerForm.model}
              onChange={(e) => setProviderForm((current) => ({ ...current, model: e.target.value }))}
              placeholder="Model"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <input
              type="number"
              value={providerForm.priority}
              onChange={(e) => setProviderForm((current) => ({ ...current, priority: Number(e.target.value) }))}
              placeholder="Priority"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <input
              value={providerForm.base_url}
              onChange={(e) => setProviderForm((current) => ({ ...current, base_url: e.target.value }))}
              placeholder="Base URL optional"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 lg:col-span-2"
            />
            <input
              type="password"
              value={providerForm.api_key}
              onChange={(e) => setProviderForm((current) => ({ ...current, api_key: e.target.value }))}
              placeholder={providerForm.id ? 'New API key optional' : 'API key'}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProviderForm((current) => ({ ...current, is_enabled: !current.is_enabled }))}
                className={`rounded-2xl px-3 py-3 text-xs font-black ring-1 ${providerForm.is_enabled ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-gray-50 text-gray-500 ring-gray-100'}`}
              >
                {providerForm.is_enabled ? 'Enabled' : 'Disabled'}
              </button>
              <button
                type="button"
                onClick={() => setProviderForm((current) => ({ ...current, is_default: !current.is_default }))}
                className={`rounded-2xl px-3 py-3 text-xs font-black ring-1 ${providerForm.is_default ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-gray-50 text-gray-500 ring-gray-100'}`}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => void saveProvider()}
                disabled={savingConfig || !providerForm.label.trim() || !providerForm.model.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50"
              >
                {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {providers.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">No provider configured.</p>
            ) : providers.map((provider) => (
              <div key={provider.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-950">{provider.label}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {providerLabels[provider.provider]} · {provider.model} · priority {provider.priority}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {provider.is_default && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700">Default</span>}
                    {provider.api_key_set && <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-black text-green-700">Key</span>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => editProvider(provider)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-600 ring-1 ring-gray-200">
                    Edit
                  </button>
                  <button type="button" onClick={() => void deleteProvider(provider.id)} disabled={savingConfig} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
          <h2 className="text-lg font-black text-gray-950">AI Token Prices</h2>
          <p className="mt-1 text-sm font-semibold text-gray-500">Set the token cost for each AI feature.</p>
          <div className="mt-5 space-y-3">
            {pricing.map((price) => (
              <label key={price.job_type} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                <span className="text-sm font-black text-gray-800">{typeLabels[price.job_type]}</span>
                <input
                  type="number"
                  min={0}
                  value={price.tokens_required}
                  onChange={(e) => setPricing((current) => current.map((item) => (
                    item.job_type === price.job_type ? { ...item, tokens_required: Math.max(0, Number(e.target.value)) } : item
                  )))}
                  className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-black text-gray-900 outline-none focus:border-[#B91C1C]"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void savePricing()}
            disabled={savingConfig || pricing.length === 0}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50"
          >
            {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save prices
          </button>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xl shadow-slate-900/5">
            <div className="mb-3 flex items-center gap-3">
              <div className={`rounded-2xl p-2 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
            </div>
            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-gray-100" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">Token Usage (30 days)</h3>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              {stats.jobs_today} jobs today
            </span>
          </div>
          {loading ? (
            <div className="h-48 animate-pulse rounded-lg bg-gray-50" />
          ) : stats.daily_usage.length > 0 ? (
            <>
              <div className="flex h-48 items-end gap-[3px]">
                {stats.daily_usage.map((day, i) => {
                  const height = (day.tokens / maxDailyTokens) * 100;
                  return (
                    <div
                      key={day.date}
                      className="group relative flex-1"
                      title={`${day.date}: ${day.tokens} tokens, ${day.jobs} jobs`}
                    >
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          i === stats.daily_usage.length - 1
                            ? 'bg-[#B91C1C]'
                            : 'bg-amber-200/70 group-hover:bg-amber-300'
                        }`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 group-hover:block">
                        <div className="whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                          <p className="font-medium">{new Date(day.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</p>
                          <p className="text-amber-300">{day.tokens} tokens</p>
                          <p className="text-gray-400">{day.jobs} jobs</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                <span>{new Date(stats.daily_usage[0]?.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</span>
                <span>Today</span>
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">No AI usage data yet</div>
          )}
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-gray-900">Top Consumers</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-gray-50" />
              ))}
            </div>
          ) : stats.top_consumers.length > 0 ? (
            <ul className="space-y-3">
              {stats.top_consumers.slice(0, 8).map((consumer, i) => (
                <li key={consumer.store_id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 text-xs font-bold text-gray-400">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{consumer.store_name}</p>
                      <p className="text-xs text-gray-400">{consumer.job_count} jobs</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-[#B91C1C]">{consumer.tokens_used.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No consumers yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#B91C1C]" />
            <h3 className="text-lg font-black text-gray-900">Usage by Type</h3>
          </div>
          <div className="space-y-3">
            {stats.by_type.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No type data</p>
            ) : (
              stats.by_type.map((item) => (
                <div key={item.type} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-gray-900">{typeLabels[item.type] || item.type}</span>
                    <span className="text-sm font-black text-[#B91C1C]">{item.count}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-gray-400">{item.tokens.toLocaleString()} tokens</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#B91C1C]" />
            <h3 className="text-lg font-black text-gray-900">Queue Health</h3>
          </div>
          <div className="space-y-3">
            {stats.by_status.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No status data</p>
            ) : (
              stats.by_status.map((item) => (
                <div key={item.status} className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClass(item.status)}`}>
                    {statusLabels[item.status] || item.status}
                  </span>
                  <span className="text-lg font-black text-gray-900">{item.count.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-[#B91C1C]" />
            <h3 className="text-lg font-black text-gray-900">Credit Wallets</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active wallets', value: stats.credits.active_wallets },
              { label: 'Unlimited', value: stats.credits.unlimited_wallets },
              { label: 'Finite remaining', value: stats.credits.finite_tokens_remaining },
              { label: 'Wallet used', value: stats.credits.tokens_used },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">{item.label}</p>
                <p className="mt-2 text-xl font-black text-[#7F1D1D]">{item.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-black text-gray-900">Recent Failures</h3>
          </div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
            {stats.failed_jobs.toLocaleString()} total failed
          </span>
        </div>
        {stats.recent_failures.length === 0 ? (
          <p className="rounded-2xl bg-green-50 p-6 text-center text-sm font-bold text-green-700">No recent AI failures.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                  <th className="py-3 pr-4">Store</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Error</th>
                  <th className="py-3 pr-4">Time</th>
                  <th className="py-3 pr-4">Job</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recent_failures.map((failure) => (
                  <tr key={failure.id} className="text-sm">
                    <td className="py-3 pr-4 font-bold text-gray-900">{failure.store_name}</td>
                    <td className="py-3 pr-4 text-gray-600">{typeLabels[failure.type] || failure.type}</td>
                    <td className="max-w-[360px] py-3 pr-4 text-red-700">
                      <span className="line-clamp-2">{failure.error_message || 'Unknown failure'}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(failure.completed_at || failure.created_at)}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-400">{failure.id.slice(-10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
