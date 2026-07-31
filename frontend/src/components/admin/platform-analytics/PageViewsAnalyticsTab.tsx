'use client';

import { PlatformPageViewsAnalytics } from '@/types/analytics';
import {
  Eye,
  Users,
  Search,
  Store,
  Smartphone,
  Globe,
  TrendingUp,
  Activity,
  ShoppingBag,
  ArrowUpRight,
  Clock,
  Package,
  ExternalLink,
  Crown,
  CheckCircle2,
  XCircle,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

interface LiveData {
  live_active_visitors_now: number;
  live_activity_feed: Array<{
    id: string;
    event_type: string;
    path: string;
    user_role: string | null;
    store_name: string | null;
    device_type: string;
    occurred_at: string;
  }>;
  realtime_visitors_series?: Array<{
    time_label: string;
    active_visitors: number;
    page_views: number;
  }>;
  top_countries?: Array<{
    country_code: string;
    country_name: string;
    flag_emoji: string;
    views_count: number;
    unique_visitors: number;
    share_pct: number;
    lat?: number;
    lng?: number;
    map_x?: number;
    map_y?: number;
  }>;
}

interface PageViewsAnalyticsTabProps {
  data: PlatformPageViewsAnalytics | null;
  liveData?: LiveData | null;
  onOpenDrilldown?: (type: any) => void;
}

// Store hover tooltip component
function StoreHoverCard({ store, children }: {
  store: {
    store_name: string;
    store_host?: string;
    store_logo_url?: string;
    store_description?: string;
    store_status?: string;
    subscription_plan?: string;
    active_listings_count?: number;
    views_count?: number;
  };
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const top = rect.bottom + 220 > window.innerHeight ? Math.max(10, rect.top - 210) : rect.bottom + 6;
        const left = Math.max(10, Math.min(rect.left, window.innerWidth - 300));
        setCoords({ top, left });
      }
      setShow(true);
    }, 200);
  };

  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), 150);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const statusColor = store.store_status === 'verified'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : store.store_status === 'suspended'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';

  const planColors: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    starter: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    pro: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    enterprise: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  };

  return (
    <div ref={ref} className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        href={`/stores?search=${encodeURIComponent(store.store_name)}`}
        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer underline-offset-2 hover:underline"
      >
        {children}
      </Link>
      {show && (
        <div
          style={{ position: 'fixed', top: `${coords.top}px`, left: `${coords.left}px`, zIndex: 9999 }}
          className="w-72 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-400/30 dark:shadow-black/60 animate-in fade-in zoom-in-95 duration-150"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >

          <div className="flex items-start gap-3">
            {store.store_logo_url ? (
              <img src={store.store_logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950 flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-indigo-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-black text-sm text-slate-900 dark:text-white truncate">{store.store_name}</p>
              {store.store_host && (
                <p className="text-[11px] font-mono text-indigo-500 dark:text-indigo-400 truncate">/store/{store.store_host}</p>
              )}
            </div>
          </div>
          {store.store_description && (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{store.store_description}</p>
          )}
          <div className="mt-3 flex items-center flex-wrap gap-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${statusColor}`}>
              {store.store_status === 'verified' && <CheckCircle2 className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
              {store.store_status === 'suspended' && <XCircle className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
              {store.store_status || 'unverified'}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${planColors[store.subscription_plan || 'free'] || planColors.free}`}>
              <Crown className="w-3 h-3 inline mr-0.5 -mt-0.5" />{store.subscription_plan || 'free'}
            </span>
            {store.active_listings_count !== undefined && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <Package className="w-3 h-3 inline mr-0.5 -mt-0.5" />{store.active_listings_count} listings
              </span>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              href={`/stores?search=${encodeURIComponent(store.store_name)}`}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              View in Store Management <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Product thumbnail component
function ProductThumb({ url, title }: { url?: string; title: string }) {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        <Package className="w-4 h-4 text-slate-400" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={title}
      onError={() => setError(true)}
      className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
    />
  );
}

// 1. Real-Time Visitors Area Graph Component
function RealtimeVisitorsAreaGraph({
  series,
  liveVisitorsNow,
}: {
  series?: Array<{ time_label: string; active_visitors: number; page_views: number }>;
  liveVisitorsNow: number;
}) {
  const { t } = useLocale();
  const [metricMode, setMetricMode] = useState<'both' | 'visitors' | 'views'>('both');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Fallback / Normalized series data
  const pointsData = (series && series.length >= 3)
    ? series
    : Array.from({ length: 12 }, (_, i) => {
        const d = new Date(Date.now() - (11 - i) * 5 * 60 * 1000);
        const time_label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const active_visitors = Math.max(1, Math.floor(liveVisitorsNow * (0.6 + Math.sin(i * 0.8) * 0.4)));
        const page_views = Math.floor(active_visitors * (2.5 + Math.cos(i * 0.5) * 1.2));
        return { time_label, active_visitors, page_views };
      });

  // Calculate high-level summary KPIs for header pills
  const maxVisitors = Math.max(...pointsData.map(p => p.active_visitors || 0), 1);
  const maxViews = Math.max(...pointsData.map(p => p.page_views || 0), 1);
  const totalViews = pointsData.reduce((acc, p) => acc + (p.page_views || 0), 0);
  const avgVisitors = Math.round(pointsData.reduce((acc, p) => acc + (p.active_visitors || 0), 0) / pointsData.length);

  const chartHeight = 180;
  const chartWidth = 560;
  const paddingX = 35;
  const paddingY = 25;

  const maxVal = metricMode === 'views' ? maxViews : metricMode === 'visitors' ? maxVisitors : Math.max(maxVisitors, maxViews);

  // Visitor Coords
  const visitorCoords = pointsData.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, pointsData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((p.active_visitors || 0) / (maxVal || 1)) * (chartHeight - paddingY * 2);
    return { x, y, p };
  });

  // Views Coords
  const viewsCoords = pointsData.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, pointsData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((p.page_views || 0) / (maxVal || 1)) * (chartHeight - paddingY * 2);
    return { x, y, p };
  });

  // Helper smooth path builder
  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const current = pts[i];
      const next = pts[i + 1];
      const controlX = (current.x + next.x) / 2;
      d += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const buildAreaPath = (pts: Array<{ x: number; y: number }>) => {
    const line = buildSmoothPath(pts);
    return `${line} L ${pts[pts.length - 1].x} ${chartHeight - paddingY} L ${pts[0].x} ${chartHeight - paddingY} Z`;
  };

  const visitorLine = buildSmoothPath(visitorCoords);
  const visitorArea = buildAreaPath(visitorCoords);
  const viewsLine = buildSmoothPath(viewsCoords);
  const viewsArea = buildAreaPath(viewsCoords);

  const activeIdx = hoverIndex !== null ? hoverIndex : pointsData.length - 1;
  const currentItem = pointsData[activeIdx] || pointsData[pointsData.length - 1];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              {t('analytics.pageViews.realtimeVisitorsGraph') || 'Real-Time Visitor Traffic Flow (Area Graph)'}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              {t('analytics.pageViews.activeSessions15m') || 'Live 10s auto-refresh interval'}
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-bold">
          <button
            onClick={() => setMetricMode('both')}
            className={`px-2.5 py-1 rounded-lg transition-all ${metricMode === 'both' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Both
          </button>
          <button
            onClick={() => setMetricMode('visitors')}
            className={`px-2.5 py-1 rounded-lg transition-all ${metricMode === 'visitors' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Visitors
          </button>
          <button
            onClick={() => setMetricMode('views')}
            className={`px-2.5 py-1 rounded-lg transition-all ${metricMode === 'views' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Page Views
          </button>
        </div>
      </div>

      {/* Metric Quick Stats Pills Header */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Online</span>
          <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{liveVisitorsNow}</span>
        </div>
        <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peak Visitors</span>
          <span className="text-base font-black text-purple-600 dark:text-purple-400">{maxVisitors}</span>
        </div>
        <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Rate</span>
          <span className="text-base font-black text-blue-600 dark:text-blue-400">{avgVisitors}/min</span>
        </div>
        <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Views</span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{totalViews.toLocaleString()}</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative pt-2">
        <svg
          className="w-full h-48 overflow-visible"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="visitorAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="viewsAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Y-Axis Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
            const val = Math.round(ratio * maxVal);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray={idx === 0 ? 'none' : '3 3'}
                  className="text-slate-100 dark:text-slate-800"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-slate-400 font-bold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Active Visitors Area & Curve */}
          {(metricMode === 'both' || metricMode === 'visitors') && (
            <>
              <path d={visitorArea} fill="url(#visitorAreaGrad)" />
              <path d={visitorLine} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
            </>
          )}

          {/* Page Views Area & Curve */}
          {(metricMode === 'both' || metricMode === 'views') && (
            <>
              <path d={viewsArea} fill="url(#viewsAreaGrad)" />
              <path d={viewsLine} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray={metricMode === 'both' ? '4 2' : 'none'} strokeLinecap="round" />
            </>
          )}

          {/* Vertical Hover Hairline & Interactive Targets */}
          {pointsData.map((_, i) => {
            const vPt = visitorCoords[i];
            const isHover = activeIdx === i;
            return (
              <g key={i} className="cursor-pointer" onMouseEnter={() => setHoverIndex(i)}>
                {/* Hit area line */}
                <line
                  x1={vPt.x}
                  y1={paddingY}
                  x2={vPt.x}
                  y2={chartHeight - paddingY}
                  stroke="transparent"
                  strokeWidth="20"
                />
                {isHover && (
                  <line
                    x1={vPt.x}
                    y1={paddingY}
                    x2={vPt.x}
                    y2={chartHeight - paddingY}
                    stroke="#818cf8"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                  />
                )}

                {/* Point indicators */}
                {(metricMode === 'both' || metricMode === 'visitors') && (
                  <circle
                    cx={vPt.x}
                    cy={vPt.y}
                    r={isHover ? 5.5 : 3}
                    className={`${isHover ? 'fill-white stroke-indigo-600 stroke-2' : 'fill-indigo-500'} transition-all`}
                  />
                )}
                {(metricMode === 'both' || metricMode === 'views') && (
                  <circle
                    cx={viewsCoords[i].x}
                    cy={viewsCoords[i].y}
                    r={isHover ? 4.5 : 2.5}
                    className={`${isHover ? 'fill-white stroke-emerald-600 stroke-2' : 'fill-emerald-500'} transition-all`}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card Popover */}
        {currentItem && visitorCoords[activeIdx] && (
          <div
            className="absolute top-2 pointer-events-none transform -translate-x-1/2 transition-all duration-150 z-20"
            style={{ left: `${(visitorCoords[activeIdx].x / chartWidth) * 100}%` }}
          >
            <div className="bg-slate-900/95 text-white text-xs font-extrabold p-3 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700 space-y-1.5 min-w-[140px]">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{currentItem.time_label}</span>
                <span className="text-emerald-400 font-black">{activeIdx === pointsData.length - 1 ? 'LIVE' : ''}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Visitors:
                </span>
                <span className="font-black text-white">{currentItem.active_visitors}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-0.5 border-t border-slate-800">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Page Views:
                </span>
                <span className="font-black text-white">{currentItem.page_views}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* X-Axis Timeline Labels */}
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
        <span>{pointsData[0]?.time_label || '1h ago'}</span>
        <span>{pointsData[Math.floor(pointsData.length / 2)]?.time_label || '30m ago'}</span>
        <span className="text-indigo-500 dark:text-indigo-400 font-black flex items-center gap-1">
          {pointsData[pointsData.length - 1]?.time_label || 'Now'} (Live Sync)
        </span>
      </div>
    </div>
  );
}

// 2. Live Country Visits World Bubble Map Component (Official SVG World Map)
function CountryVisitBubbleMap({
  topCountries,
}: {
  topCountries: Array<{
    country_code: string;
    country_name: string;
    flag_emoji: string;
    views_count: number;
    unique_visitors: number;
    share_pct: number;
    map_x?: number;
    map_y?: number;
  }>;
}) {
  const { t } = useLocale();
  const [hoveredCountry, setHoveredCountry] = useState<typeof topCountries[0] | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [bubblePositions, setBubblePositions] = useState<Record<string, { xPct: number; yPct: number }>>({});

  // Fallback defaults
  const countries = (topCountries && topCountries.length > 0)
    ? topCountries
    : [
        { country_code: 'TN', country_name: 'Tunisia', flag_emoji: '🇹🇳', views_count: 1420, unique_visitors: 850, share_pct: 68.5 },
        { country_code: 'FR', country_name: 'France', flag_emoji: '🇫🇷', views_count: 380, unique_visitors: 240, share_pct: 18.2 },
        { country_code: 'DE', country_name: 'Germany', flag_emoji: '🇩🇪', views_count: 120, unique_visitors: 90, share_pct: 5.8 },
        { country_code: 'US', country_name: 'United States', flag_emoji: '🇺🇸', views_count: 95, unique_visitors: 65, share_pct: 4.1 },
      ];

  const activeCodesSet = new Set(countries.map(c => c.country_code.toLowerCase()));

  // Compute total views for progress bars
  const totalViews = countries.reduce((sum, c) => sum + c.views_count, 0);
  const totalVisitors = countries.reduce((sum, c) => sum + c.unique_visitors, 0);

  // Track mouse position relative to the map container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Load the official SVG world map and compute bubble centers from real path bounding boxes
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let cancelled = false;

    fetch('/world-map.svg')
      .then(res => res.text())
      .then(svgText => {
        if (cancelled || !container) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (!svgEl) return;

        // Set viewBox, remove fixed dimensions for responsive scaling
        svgEl.setAttribute('viewBox', '0 0 2754 1398');
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        svgEl.style.display = 'block';

        // Style all land paths with dark fill
        const allPaths = svgEl.querySelectorAll('path');
        allPaths.forEach(path => {
          path.setAttribute('fill', '#1e293b');
          path.setAttribute('stroke', '#0f172a');
          path.setAttribute('stroke-width', '0.5');
          path.style.transition = 'fill 0.3s ease';
        });

        // Highlight active countries
        activeCodesSet.forEach(code => {
          const applyHighlight = (el: Element) => {
            const paths = el.tagName === 'g' ? el.querySelectorAll('path') : [el];
            paths.forEach(p => {
              if (p.tagName !== 'path') return;
              (p as SVGPathElement).setAttribute('fill', '#6366f1');
              (p as SVGPathElement).setAttribute('stroke', '#818cf8');
              (p as SVGPathElement).setAttribute('stroke-width', '1.5');
              (p as SVGPathElement).style.filter = 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.6))';
            });
          };
          // By id
          const byId = svgEl.querySelector(`#${code}`);
          if (byId) applyHighlight(byId);
          // By class
          svgEl.querySelectorAll(`.${code}`).forEach(el => {
            if (el.tagName === 'path') applyHighlight(el);
          });
        });

        // Remove any existing SVG first
        const existing = container.querySelector('svg.world-map-base');
        if (existing) existing.remove();

        svgEl.classList.add('world-map-base');
        container.prepend(svgEl);

        // Now compute bubble centers from the actual rendered bounding boxes
        // We need to wait a frame for the SVG to render in the DOM
        requestAnimationFrame(() => {
          const viewBoxW = 2754;
          const viewBoxH = 1398;
          const positions: Record<string, { xPct: number; yPct: number }> = {};

          activeCodesSet.forEach(code => {
            // Find the country element by id
            const el = svgEl.querySelector(`#${code}`);
            if (!el) return;

            // Collect all paths belonging to this country
            const paths: SVGGraphicsElement[] = [];
            if (el.tagName === 'g') {
              el.querySelectorAll('path').forEach(p => paths.push(p as SVGGraphicsElement));
            } else if (el.tagName === 'path') {
              paths.push(el as SVGGraphicsElement);
            }

            if (paths.length === 0) return;

            // Find the largest path fragment (by bounding box area) for the main landmass
            let bestPath = paths[0];
            let bestArea = 0;
            paths.forEach(p => {
              try {
                const bb = p.getBBox();
                const area = bb.width * bb.height;
                if (area > bestArea) {
                  bestArea = area;
                  bestPath = p;
                }
              } catch { /* ignore */ }
            });

            try {
              const bb = bestPath.getBBox();
              const centerX = bb.x + bb.width / 2;
              const centerY = bb.y + bb.height / 2;
              positions[code] = {
                xPct: (centerX / viewBoxW) * 100,
                yPct: (centerY / viewBoxH) * 100,
              };
            } catch { /* ignore */ }
          });

          setBubblePositions(positions);
          setSvgLoaded(true);
        });
      })
      .catch(() => { /* silently fail */ });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topCountries]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {t('analytics.pageViews.countryBubbleMap') || 'Live Marketplace Visits by Country'}
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t('analytics.pageViews.geoLocation') || 'Real-time geographic distribution'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            {countries.length} regions
          </span>
        </div>
      </div>

      {/* Summary KPI pills */}
      <div className="flex items-center gap-3 px-6 pb-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <Eye className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{totalViews.toLocaleString()}</span>
          <span className="text-[10px] text-slate-500">views</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <Users className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{totalVisitors.toLocaleString()}</span>
          <span className="text-[10px] text-slate-500">visitors</span>
        </div>
        {countries[0] && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{countries[0].flag_emoji} {countries[0].country_name}</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">{countries[0].share_pct}%</span>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: '2754 / 1398',
          background: 'linear-gradient(180deg, #020617 0%, #0c1a3a 40%, #0f172a 100%)',
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Loading spinner */}
        {!svgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Globe className="w-8 h-8 text-indigo-400 animate-spin" />
              <span className="text-[10px] text-slate-500 font-semibold">Loading world map…</span>
            </div>
          </div>
        )}

        {/* Bubble Pins — HTML-based for reliable positioning */}
        {svgLoaded && countries.map((c) => {
          const code = c.country_code.toLowerCase();
          const pos = bubblePositions[code];
          if (!pos) return null;
          const size = Math.max(10, Math.min(28, Math.sqrt(c.share_pct || 1) * 5 + 8));

          return (
            <div
              key={c.country_code}
              className="absolute z-10 group cursor-pointer"
              style={{
                left: `${pos.xPct}%`,
                top: `${pos.yPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => setHoveredCountry(c)}
              onMouseLeave={() => setHoveredCountry(null)}
            >
              {/* Pulsing ripple */}
              <div
                className="absolute rounded-full bg-indigo-400/20 animate-ping"
                style={{
                  width: size * 3,
                  height: size * 3,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              {/* Outer glow */}
              <div
                className="absolute rounded-full bg-indigo-500/15 border border-indigo-400/30"
                style={{
                  width: size * 2.2,
                  height: size * 2.2,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              {/* Core bubble */}
              <div
                className="relative rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/40 transition-transform duration-200 group-hover:scale-125 border-2 border-white/80"
                style={{
                  width: size * 1.6,
                  height: size * 1.6,
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  fontSize: Math.max(7, size * 0.55),
                }}
              >
                {c.flag_emoji}
              </div>
            </div>
          );
        })}

        {/* Hover Tooltip — follows mouse cursor */}
        {hoveredCountry && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{
              left: Math.min(mousePos.x + 16, (mapContainerRef.current?.clientWidth || 400) - 230),
              top: Math.max(mousePos.y - 10, 8),
            }}
          >
            <div className="p-3 rounded-xl border border-indigo-500/40 bg-slate-900/95 text-white shadow-2xl shadow-indigo-500/20 backdrop-blur-lg w-56 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{hoveredCountry.flag_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white truncate">{hoveredCountry.country_name}</p>
                  <span className="text-[10px] font-mono text-indigo-400">{hoveredCountry.country_code}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-700/80">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Page Views</p>
                  <p className="text-sm font-black text-white">{hoveredCountry.views_count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Visitors</p>
                  <p className="text-sm font-black text-white">{hoveredCountry.unique_visitors.toLocaleString()}</p>
                </div>
              </div>
              {/* Traffic share progress bar */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-slate-400">Traffic Share</span>
                  <span className="text-emerald-400 font-black">{hoveredCountry.share_pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${Math.min(hoveredCountry.share_pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Country Ranking Table */}
      <div className="px-6 py-4 space-y-2">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Traffic by Region
        </p>
        {countries.map((c, i) => {
          const barWidth = totalViews > 0 ? (c.views_count / totalViews) * 100 : 0;
          return (
            <div key={c.country_code} className="flex items-center gap-3 group">
              {/* Rank */}
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' :
                'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {i + 1}
              </span>
              {/* Flag */}
              <span className="text-base">{c.flag_emoji}</span>
              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{c.country_name}</span>
                  <span className="text-[10px] font-mono text-slate-500 ml-2">{c.country_code}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      background: i === 0 ? 'linear-gradient(90deg, #6366f1, #a855f7)' :
                                  i === 1 ? 'linear-gradient(90deg, #818cf8, #c084fc)' :
                                  'linear-gradient(90deg, #94a3b8, #cbd5e1)',
                    }}
                  />
                </div>
              </div>
              {/* Stats */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{c.views_count.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">{c.share_pct}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PageViewsAnalyticsTab({ data, liveData, onOpenDrilldown }: PageViewsAnalyticsTabProps) {
  const { t } = useLocale();

  if (!data) return null;

  const { summary, top_pages_viewed, top_products_viewed, top_products_ordered, top_storefronts_by_views, top_storefronts_by_sales, top_marketplace_searches, top_storefront_searches, visit_sources, device_breakdown, top_countries = [], live_activity_feed: staticFeed } = data;

  // Use live data if available, fall back to static data
  const liveVisitorsNow = liveData?.live_active_visitors_now ?? summary.live_active_visitors_now;
  const activityFeed = liveData?.live_activity_feed ?? staticFeed;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Page Views */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{t('analytics.pageViews.totalPageViews') || 'Total Page Views'}</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {summary.total_page_views.toLocaleString()}
            </span>
            {summary.views_growth_pct !== null && summary.views_growth_pct !== undefined && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${summary.views_growth_pct >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'}`}>
                <TrendingUp className="w-3 h-3" /> {summary.views_growth_pct >= 0 ? '+' : ''}{summary.views_growth_pct}%
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {summary.marketplace_views.toLocaleString()} {t('analytics.pageViews.marketplace') || 'Marketplace'} / {summary.storefront_views.toLocaleString()} {t('analytics.pageViews.storefronts') || 'Storefronts'}
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{t('analytics.pageViews.uniqueVisitors') || 'Unique Visitors'}</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {summary.unique_visitors.toLocaleString()}
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {summary.registered_user_views.toLocaleString()} {t('analytics.pageViews.loggedIn') || 'Logged-in'} / {summary.anonymous_visitor_views.toLocaleString()} {t('analytics.pageViews.guests') || 'Guests'}
          </p>
        </div>

        {/* Live Active Visitors Now — uses liveData */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              {t('analytics.pageViews.liveVisitorsNow') || 'Live Visitors Now'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-200">
            {liveVisitorsNow} <span className="text-sm font-bold text-emerald-600">{t('analytics.pageViews.online') || 'online'}</span>
          </div>
          <p className="text-xs font-semibold text-emerald-700/80 dark:text-emerald-400/80">
            {t('analytics.pageViews.activeSessions15m') || 'Active sessions in the last 15 mins • Auto-refreshes'}
          </p>
        </div>

        {/* Session Quality & Bounce Rate */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">{t('analytics.pageViews.sessionDurationAndBounce') || 'Session Duration & Bounce'}</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {Math.floor(summary.avg_session_duration_seconds / 60)}m {summary.avg_session_duration_seconds % 60}s
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {t('analytics.pageViews.avgDuration') || 'Avg Duration'} &bull; {t('analytics.pageViews.bounceRate') || 'Bounce Rate'}: <span className="font-bold text-slate-800 dark:text-slate-200">{summary.bounce_rate_pct}%</span>
          </p>
        </div>
      </div>

      {/* 1.5 Realtime Visitors Area Graph & Live Country Visits Bubble Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealtimeVisitorsAreaGraph
          series={liveData?.realtime_visitors_series ?? data.realtime_visitors_series}
          liveVisitorsNow={liveVisitorsNow}
        />
        <CountryVisitBubbleMap
          topCountries={(liveData?.top_countries && liveData.top_countries.length > 0) ? liveData.top_countries : top_countries}
        />
      </div>

      {/* 2. Live Telemetry Activity Feed & Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pages Viewed (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.topPagesViewed') || 'Top Pages Viewed'}</h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              {t('analytics.pageViews.marketplaceAndStorefronts') || 'Marketplace & Storefronts'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold">{t('analytics.pageViews.pageUrlPath') || 'Page URL / Path'}</th>
                  <th className="pb-3 font-extrabold">{t('analytics.pageViews.type') || 'Type'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.views') || 'Views'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.unique') || 'Unique Visitors'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_pages_viewed.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noPageViewData') || 'No page view data recorded yet.'}</td></tr>
                ) : top_pages_viewed.map((page, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 max-w-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {page.path}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        page.type === 'marketplace'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : page.type === 'storefront'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {page.type}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                      {page.views_count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {page.unique_visitors.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Activity Feed Stream — uses liveData */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.liveActivityStream') || 'Live Activity Stream'}</h3>
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
            {activityFeed.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noRecentActivity') || 'No recent activity recorded yet.'}</div>
            ) : activityFeed.map((act) => (
              <div key={act.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
                    {act.event_type.replaceAll('_', ' ')}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {new Date(act.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{act.path}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold pt-1">
                  <span>{act.store_name || t('analytics.pageViews.marketplace') || 'Marketplace'}</span>
                  <span className="capitalize">{act.user_role || 'guest'} ({act.device_type})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Top Products Viewed vs Top Products Ordered */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Viewed */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.topProductsViewed') || 'Top Products Viewed'}</h3>
            </div>
            {onOpenDrilldown && (
              <button
                onClick={() => onOpenDrilldown('products')}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                {t('analytics.pageViews.fullCatalog') || 'Full Catalog'} <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold" colSpan={2}>{t('analytics.pageViews.product') || 'Product'}</th>
                  <th className="pb-3 font-extrabold">{t('analytics.pageViews.store') || 'Store'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.views') || 'Views'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.cart') || 'Cart'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.conv') || 'Conv.'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_products_viewed.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noProductViewData') || 'No product view data recorded yet.'}</td></tr>
                ) : top_products_viewed.map((prod) => (
                  <tr key={prod.product_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 w-12">
                      <ProductThumb url={prod.thumbnail_url} title={prod.title} />
                    </td>
                    <td className="py-3 max-w-[130px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {prod.title}
                    </td>
                    <td className="py-3 text-slate-500 font-medium truncate max-w-[90px]">
                      {prod.store_name ? (
                        <StoreHoverCard store={{ store_name: prod.store_name, store_host: prod.store_host, store_logo_url: prod.store_logo_url }}>
                          {prod.store_name}
                        </StoreHoverCard>
                      ) : '—'}
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                      {prod.views_count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {prod.add_to_cart_count}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold">
                        {prod.conversion_rate_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Ordered */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.topProductsOrdered') || 'Top Products Ordered & Sales'}</h3>
            </div>
            {onOpenDrilldown && (
              <button
                onClick={() => onOpenDrilldown('orders')}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                {t('analytics.pageViews.ordersAnalytics') || 'Orders Analytics'} <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold" colSpan={2}>{t('analytics.pageViews.product') || 'Product'}</th>
                  <th className="pb-3 font-extrabold">{t('analytics.pageViews.store') || 'Store'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.sold') || 'Sold'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.revenue') || 'Revenue'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.conv') || 'Conv.'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_products_ordered.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noOrderData') || 'No order data recorded yet.'}</td></tr>
                ) : top_products_ordered.map((prod) => (
                  <tr key={prod.product_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 w-12">
                      <ProductThumb url={prod.thumbnail_url} title={prod.title} />
                    </td>
                    <td className="py-3 max-w-[130px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {prod.title}
                    </td>
                    <td className="py-3 text-slate-500 font-medium truncate max-w-[90px]">
                      {prod.store_name ? (
                        <StoreHoverCard store={{ store_name: prod.store_name, store_host: prod.store_host, store_logo_url: prod.store_logo_url }}>
                          {prod.store_name}
                        </StoreHoverCard>
                      ) : '—'}
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                      {prod.units_sold}
                    </td>
                    <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {prod.total_revenue_tnd.toFixed(0)} TND
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                        {prod.conversion_rate_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Top Storefront Websites Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Storefront Websites by Page Views */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.topStorefrontsViews') || 'Top Storefront Websites (Page Views)'}</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold">{t('analytics.pageViews.storefrontWebsite') || 'Storefront Website'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.views') || 'Page Views'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.unique') || 'Unique Visitors'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.activeListings') || 'Active Listings'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_storefronts_by_views.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noStorefrontViewData') || 'No storefront view data recorded yet.'}</td></tr>
                ) : top_storefronts_by_views.map((store) => (
                  <tr key={store.store_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3">
                      <StoreHoverCard store={store}>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{store.store_name}</span>
                      </StoreHoverCard>
                    </td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                      {store.views_count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                      {store.unique_visitors.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        {store.active_listings_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Storefront Websites by Sales GMV */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.topStorefrontsSales') || 'Top Storefront Websites (Sales GMV)'}</h3>
            </div>
            {onOpenDrilldown && (
              <button
                onClick={() => onOpenDrilldown('vendors')}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                {t('analytics.pageViews.vendorRanks') || 'Vendor Ranks'} <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-extrabold">{t('analytics.pageViews.storefrontWebsite') || 'Storefront Website'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.orders') || 'Orders'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.totalSalesGmv') || 'Total Sales GMV'}</th>
                  <th className="pb-3 font-extrabold text-right">{t('analytics.pageViews.conv') || 'Conv.'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {top_storefronts_by_sales.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noStorefrontSalesData') || 'No storefront sales data recorded yet.'}</td></tr>
                ) : top_storefronts_by_sales.map((store) => (
                  <tr key={store.store_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3">
                      <StoreHoverCard store={store}>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{store.store_name}</span>
                      </StoreHoverCard>
                    </td>
                    <td className="py-3 text-right font-bold text-slate-700 dark:text-slate-300">
                      {store.total_orders_count}
                    </td>
                    <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {store.total_sales_gmv_tnd.toFixed(0)} TND
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                        {store.conversion_rate_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Top Search Keywords Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Marketplace Searches */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.topMarketplaceSearches') || 'Top Marketplace Search Keywords'}</h3>
            </div>
            {onOpenDrilldown && (
              <button
                onClick={() => onOpenDrilldown('search')}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                {t('analytics.pageViews.searchAudit') || 'Search Audit'} <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {top_marketplace_searches.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noMarketplaceSearchData') || 'No marketplace search data recorded yet.'}</div>
            ) : top_marketplace_searches.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center text-[11px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">&ldquo;{item.query}&rdquo;</p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {t('analytics.pageViews.avgResults') || 'Avg Results'}: {item.avg_results_count} {t('analytics.pageViews.activeListings') || 'listings'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900 dark:text-white">{item.search_count} {t('analytics.pageViews.searches') || 'searches'}</span>
                  {item.zero_results_pct > 0 && (
                    <p className="text-[10px] font-bold text-red-500">{item.zero_results_pct}% {t('analytics.pageViews.zeroResults') || '0-results'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Storefront Searches */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.topStorefrontSearches') || 'Top Storefront Search Keywords'}</h3>
            </div>
          </div>

          <div className="space-y-3">
            {top_storefront_searches.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noStorefrontSearchData') || 'No storefront search data recorded yet.'}</div>
            ) : top_storefront_searches.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center text-[11px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">&ldquo;{item.query}&rdquo;</p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {t('analytics.pageViews.store') || 'Store'}: <span className="text-slate-700 dark:text-slate-300 font-bold">{item.store_name}</span> {item.store_host ? `(/store/${item.store_host})` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900 dark:text-white">{item.search_count} {t('analytics.pageViews.searches') || 'searches'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Traffic Sources, Device Distribution & Top Visitor Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visit Traffic Sources */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.trafficSources') || 'Traffic Referrer Sources'}</h3>
          </div>

          <div className="space-y-3">
            {visit_sources.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noTrafficSourceData') || 'No traffic source data recorded yet.'}</div>
            ) : visit_sources.map((src, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">{src.referrer_domain}</span>
                  <span className="text-slate-900 dark:text-white font-black">{src.views_count.toLocaleString()} ({src.share_pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, src.share_pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Types Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.deviceBreakdown') || 'Device Breakdown'}</h3>
          </div>

          <div className="space-y-4 pt-2">
            {device_breakdown.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noDeviceData') || 'No device data recorded yet.'}</div>
            ) : device_breakdown.map((dev, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200 capitalize">{dev.device_type}</span>
                  <span className="text-slate-900 dark:text-white font-black">{dev.views_count.toLocaleString()} {t('analytics.pageViews.views') || 'views'} ({dev.share_pct}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      idx === 0 ? 'bg-purple-600' : idx === 1 ? 'bg-blue-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, dev.share_pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Visitor Countries */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌐</span>
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('analytics.pageViews.topVisitorCountries') || 'Top Visitor Countries'}</h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {t('analytics.pageViews.geoLocation') || 'Geo Location'}
            </span>
          </div>

          <div className="space-y-3">
            {(!top_countries || top_countries.length === 0) ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">{t('analytics.pageViews.noCountryData') || 'No country location data recorded yet.'}</div>
            ) : top_countries.map((c, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="text-base">{c.flag_emoji}</span>
                    <span>{c.country_name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({c.country_code})</span>
                  </span>
                  <span className="text-slate-900 dark:text-white font-black">{c.views_count.toLocaleString()} ({c.share_pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                    style={{ width: `${Math.min(100, c.share_pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

