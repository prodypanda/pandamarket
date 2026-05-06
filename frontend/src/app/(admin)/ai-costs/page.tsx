'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Cpu, Coins, ImageIcon, FileText } from 'lucide-react';

interface AiStats {
  total_jobs: number;
  total_tokens_consumed: number;
  jobs_today: number;
  tokens_today: number;
  compression_jobs: number;
  seo_jobs: number;
  estimated_cost_tnd: number;
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

const DEFAULT_STATS: AiStats = {
  total_jobs: 0,
  total_tokens_consumed: 0,
  jobs_today: 0,
  tokens_today: 0,
  compression_jobs: 0,
  seo_jobs: 0,
  estimated_cost_tnd: 0,
  top_consumers: [],
  daily_usage: [],
};

export default function AiCostDashboard() {
  const [stats, setStats] = useState<AiStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetchWithCsrf('/api/pd/admin/ai-stats', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // fallback to defaults
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const maxDailyTokens = Math.max(...(stats.daily_usage.map((d) => d.tokens) || [1]), 1);

  const statCards = [
    { label: 'Total AI Jobs', value: stats.total_jobs, icon: Cpu, color: 'text-purple-600 bg-purple-50' },
    { label: 'Tokens Consumed', value: stats.total_tokens_consumed.toLocaleString(), icon: Coins, color: 'text-[#16C784] bg-[#16C784]/10' },
    { label: 'Compression Jobs', value: stats.compression_jobs, icon: ImageIcon, color: 'text-blue-600 bg-blue-50' },
    { label: 'SEO Jobs', value: stats.seo_jobs, icon: FileText, color: 'text-orange-600 bg-orange-50' },
    { label: 'Jobs Today', value: stats.jobs_today, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Est. API Cost', value: `${stats.estimated_cost_tnd.toFixed(3)} TND`, icon: Sparkles, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Cost Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor AI service usage and estimated costs across the platform.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
            </div>
            {loading ? (
              <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Chart (30 days) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Usage (30 days)</h3>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : stats.daily_usage.length > 0 ? (
            <>
              <div className="h-48 flex items-end gap-[2px]">
                {stats.daily_usage.map((day, i) => {
                  const height = (day.tokens / maxDailyTokens) * 100;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 group relative"
                      title={`${day.date}: ${day.tokens} tokens, ${day.jobs} jobs`}
                    >
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          i === stats.daily_usage.length - 1
                            ? 'bg-purple-500'
                            : 'bg-purple-300/50 group-hover:bg-purple-400/70'
                        }`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                          <p className="font-medium">{new Date(day.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</p>
                          <p className="text-purple-300">{day.tokens} tokens</p>
                          <p className="text-gray-400">{day.jobs} jobs</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                <span>{new Date(stats.daily_usage[0]?.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</span>
                <span>Today</span>
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No AI usage data yet
            </div>
          )}
        </div>

        {/* Top Consumers */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Consumers</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : stats.top_consumers.length > 0 ? (
            <ul className="space-y-3">
              {stats.top_consumers.slice(0, 8).map((consumer, i) => (
                <li key={consumer.store_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                        {consumer.store_name}
                      </p>
                      <p className="text-xs text-gray-400">{consumer.job_count} jobs</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-purple-600">
                    {consumer.tokens_used.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No consumers yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
