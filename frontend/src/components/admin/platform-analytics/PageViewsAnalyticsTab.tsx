'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { DrilldownType, PlatformPageViewsAnalytics } from '@/types/analytics';
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
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Wifi,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MousePointer2,
  Sparkles,
  Gauge,
  Target,
  Crosshair,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { TunisiaChoroplethMap } from './TunisiaChoroplethMap';

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
    ip_addresses?: Array<{
      ip: string;
      city?: string;
      isp?: string;
      views_count: number;
      device_type?: string;
      last_active?: string;
      is_active_now?: boolean;
    }>;
    lat?: number;
    lng?: number;
    map_x?: number;
    map_y?: number;
  }>;
}

interface PageViewsAnalyticsTabProps {
  data: PlatformPageViewsAnalytics | null;
  liveData?: LiveData | null;
  onOpenDrilldown?: (type: DrilldownType) => void;
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
              <img src={store.store_logo_url ? getResizedImageUrl(store.store_logo_url, 'medium') : ''} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0" />
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
  const [fallbackBaseTime] = useState(() => Date.now());

  // Normalize series data & synchronize latest interval with live online count
  const rawPoints = series && series.length > 0 ? series : [];
  const pointsData =
    rawPoints.length > 0
      ? rawPoints.map((p, idx) => {
          if (idx === rawPoints.length - 1 && liveVisitorsNow > p.active_visitors) {
            return { ...p, active_visitors: liveVisitorsNow };
          }
          return p;
        })
      : Array.from({ length: 12 }, (_, i) => {
          const d = new Date(fallbackBaseTime - (11 - i) * 5 * 60 * 1000);
          const time_label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const active_visitors = i === 11 ? Math.max(liveVisitorsNow, 0) : 0;
          const page_views = active_visitors * 2;
          return { time_label, active_visitors, page_views };
        });

  // Calculate high-level summary KPIs for header pills
  const maxVisitors = Math.max(...pointsData.map((p) => p.active_visitors || 0), 1);
  const maxViews = Math.max(...pointsData.map((p) => p.page_views || 0), 1);
  const totalViews = pointsData.reduce((acc, p) => acc + (p.page_views || 0), 0);
  const avgVisitors = Math.round(
    pointsData.reduce((acc, p) => acc + (p.active_visitors || 0), 0) / pointsData.length
  );

  const chartHeight = 180;
  const chartWidth = 560;
  const paddingX = 35;
  const paddingY = 25;

  const maxVal =
    metricMode === 'views'
      ? maxViews
      : metricMode === 'visitors'
      ? maxVisitors
      : Math.max(maxVisitors, maxViews);

  // Visitor Coords
  const visitorCoords = pointsData.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, pointsData.length - 1)) * (chartWidth - paddingX * 2);
    const y =
      chartHeight - paddingY - ((p.active_visitors || 0) / (maxVal || 1)) * (chartHeight - paddingY * 2);
    return { x, y, p };
  });

  // Views Coords
  const viewsCoords = pointsData.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, pointsData.length - 1)) * (chartWidth - paddingX * 2);
    const y =
      chartHeight - paddingY - ((p.page_views || 0) / (maxVal || 1)) * (chartHeight - paddingY * 2);
    return { x, y, p };
  });

  // Helper smooth path builder
  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (!pts || pts.length === 0) return '';
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
    if (!pts || pts.length === 0) return '';
    const line = buildSmoothPath(pts);
    return `${line} L ${pts[pts.length - 1].x} ${chartHeight - paddingY} L ${pts[0].x} ${
      chartHeight - paddingY
    } Z`;
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
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'both'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Both
          </button>
          <button
            onClick={() => setMetricMode('visitors')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'visitors'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visitors
          </button>
          <button
            onClick={() => setMetricMode('views')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              metricMode === 'views'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
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

        {/* Hover Tooltip Card Popover with Edge Boundary Protection */}
        {currentItem && visitorCoords[activeIdx] && (
          <div
            className={`absolute top-2 pointer-events-none transition-all duration-150 z-20 ${
              activeIdx <= 1
                ? 'left-2 translate-x-0'
                : activeIdx >= pointsData.length - 2
                ? 'right-2 translate-x-0'
                : '-translate-x-1/2'
            }`}
            style={
              activeIdx <= 1
                ? { left: '8px' }
                : activeIdx >= pointsData.length - 2
                ? { right: '8px' }
                : { left: `${(visitorCoords[activeIdx].x / chartWidth) * 100}%` }
            }
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
    ip_addresses?: Array<{
      ip: string;
      city?: string;
      isp?: string;
      views_count: number;
      device_type?: string;
      last_active?: string;
      is_active_now?: boolean;
    }>;
    map_x?: number;
    map_y?: number;
  }>;
}) {
  const { t } = useLocale();
  const [hoveredCountry, setHoveredCountry] = useState<any | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number; containerWidth: number }>({ x: 0, y: 0, containerWidth: 400 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [bubblePositions, setBubblePositions] = useState<Record<string, { xPct: number; yPct: number }>>({});

  // Telemetry mode: 'live_heartbeat' (with 30s grace timeout) vs 'all_24h'
  const [telemetryFilter, setTelemetryFilter] = useState<'live_heartbeat' | 'all_24h'>('live_heartbeat');
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Heartbeat ticker re-evaluates timestamps every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 2000);
    return () => clearInterval(timer);
  }, []);

  // Expandable/Collapsible state
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Fallback defaults with sample IP addresses
  const rawCountries = (topCountries && topCountries.length > 0)
    ? topCountries
    : [
        {
          country_code: 'TN',
          country_name: 'Tunisia',
          flag_emoji: '🇹🇳',
          views_count: 1420,
          unique_visitors: 850,
          share_pct: 68.5,
          ip_addresses: [
            { ip: '197.26.18.42', city: 'Tunis', isp: 'Tunisie Télécom', device_type: 'Mobile (Android)', is_active_now: true, views_count: 540, last_active: new Date().toISOString() },
            { ip: '102.164.92.105', city: 'Sousse', isp: 'Ooredoo Tunisia', device_type: 'Desktop (Chrome)', is_active_now: true, views_count: 320, last_active: new Date().toISOString() },
            { ip: '41.226.11.84', city: 'Sfax', isp: 'Topnet Fibre', device_type: 'Mobile (iOS)', is_active_now: false, views_count: 280, last_active: new Date(Date.now() - 25 * 1000).toISOString() },
            { ip: '197.28.140.12', city: 'Monastir', isp: 'Orange Tunisie', device_type: 'Desktop (Firefox)', is_active_now: false, views_count: 160, last_active: new Date(Date.now() - 50 * 1000).toISOString() },
          ],
        },
        {
          country_code: 'FR',
          country_name: 'France',
          flag_emoji: '🇫🇷',
          views_count: 380,
          unique_visitors: 240,
          share_pct: 18.2,
          ip_addresses: [
            { ip: '51.15.22.80', city: 'Paris', isp: 'Orange SA', device_type: 'Desktop (Chrome)', is_active_now: true, views_count: 180, last_active: new Date().toISOString() },
            { ip: '90.85.12.190', city: 'Marseille', isp: 'SFR Fiber', device_type: 'Mobile (iOS)', is_active_now: false, views_count: 90, last_active: new Date(Date.now() - 20 * 1000).toISOString() },
          ],
        },
        {
          country_code: 'DE',
          country_name: 'Germany',
          flag_emoji: '🇩🇪',
          views_count: 120,
          unique_visitors: 90,
          share_pct: 5.8,
          ip_addresses: [
            { ip: '88.198.45.12', city: 'Frankfurt', isp: 'Hetzner Online', device_type: 'Desktop (Chrome)', is_active_now: false, views_count: 70, last_active: new Date(Date.now() - 28 * 1000).toISOString() },
          ],
        },
        {
          country_code: 'US',
          country_name: 'United States',
          flag_emoji: '🇺🇸',
          views_count: 95,
          unique_visitors: 65,
          share_pct: 4.1,
          ip_addresses: [
            { ip: '54.239.28.85', city: 'Ashburn, VA', isp: 'Amazon AWS', device_type: 'Desktop (Chrome)', is_active_now: true, views_count: 55, last_active: new Date().toISOString() },
          ],
        },
      ];

  // Helper to compute live telemetry heartbeat & 30s grace timeout per country
  const getCountryTelemetryStatus = useCallback((c: typeof rawCountries[0]) => {
    const ips = c.ip_addresses || [];
    if (ips.length === 0) {
      return { status: 'LIVE_ACTIVE' as const, liveCount: 1, coolingCount: 0, graceTimeRemainingSec: 0 };
    }

    let liveCount = 0;
    let coolingCount = 0;
    let minGraceRemainingSec = 30;

    ips.forEach(ip => {
      const lastActiveMs = ip.last_active ? new Date(ip.last_active).getTime() : 0;
      const ageSec = lastActiveMs > 0 ? Math.max(0, (currentTime - lastActiveMs) / 1000) : 999;

      if (ip.is_active_now || ageSec <= 15) {
        liveCount++;
      } else if (ageSec > 15 && ageSec <= 45) {
        coolingCount++;
        const remaining = Math.max(1, Math.ceil(45 - ageSec));
        if (remaining < minGraceRemainingSec) minGraceRemainingSec = remaining;
      }
    });

    if (liveCount > 0) {
      return { status: 'LIVE_ACTIVE' as const, liveCount, coolingCount: 0, graceTimeRemainingSec: 0 };
    }
    if (coolingCount > 0) {
      return { status: 'PALE_GRACE' as const, liveCount: 0, coolingCount, graceTimeRemainingSec: minGraceRemainingSec };
    }
    return { status: 'EXPIRED' as const, liveCount: 0, coolingCount: 0, graceTimeRemainingSec: 0 };
  }, [currentTime]);

  // Evaluated countries with telemetry statuses
  const countriesWithTelemetry = useMemo(() => {
    return rawCountries.map(c => {
      const telemetry = getCountryTelemetryStatus(c);
      return { ...c, telemetry };
    });
  }, [rawCountries, getCountryTelemetryStatus]);

  // Displayed countries based on selected filter mode (live mode excludes expired items after 30s grace)
  const displayedCountries = useMemo(() => {
    return countriesWithTelemetry.filter(c => {
      if (telemetryFilter === 'all_24h') return true;
      return c.telemetry.status === 'LIVE_ACTIVE' || c.telemetry.status === 'PALE_GRACE';
    });
  }, [countriesWithTelemetry, telemetryFilter]);

  const activeCodesSet = new Set(displayedCountries.map(c => c.country_code.toLowerCase()));

  // Compute totals
  const totalViews = displayedCountries.reduce((sum, c) => sum + c.views_count, 0);
  const totalVisitors = displayedCountries.reduce((sum, c) => sum + c.unique_visitors, 0);
  const totalIpsCount = displayedCountries.reduce((sum, c) => sum + (c.ip_addresses?.length || 0), 0);
  const activeNowCount = displayedCountries.reduce((sum, c) => sum + (c.telemetry.status === 'LIVE_ACTIVE' ? (c.ip_addresses?.filter(ip => ip.is_active_now).length || 1) : 0), 0);
  const paleGraceCount = displayedCountries.filter(c => c.telemetry.status === 'PALE_GRACE').length;
  const topTrafficShare = displayedCountries[0]?.share_pct ?? 0;
  const marketConcentrationLabel = topTrafficShare >= 70 ? 'High concentration' : topTrafficShare >= 40 ? 'Healthy lead market' : 'Diversified traffic';

  // Toggle single country expansion
  const toggleExpand = (countryCode: string) => {
    setExpandedCountries(prev => ({
      ...prev,
      [countryCode]: !prev[countryCode],
    }));
  };

  // Toggle all countries expansion
  const allExpanded = displayedCountries.every(c => expandedCountries[c.country_code]);
  const toggleExpandAll = () => {
    const nextState: Record<string, boolean> = {};
    displayedCountries.forEach(c => {
      nextState[c.country_code] = !allExpanded;
    });
    setExpandedCountries(nextState);
  };

  // Copy IP handler
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Filter countries by search term
  const filteredCountries = displayedCountries.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const matchCountry = c.country_name.toLowerCase().includes(term) || c.country_code.toLowerCase().includes(term);
    const matchIp = c.ip_addresses?.some(ipObj => ipObj.ip.toLowerCase().includes(term) || (ipObj.city && ipObj.city.toLowerCase().includes(term)) || (ipObj.isp && ipObj.isp.toLowerCase().includes(term)));
    return matchCountry || matchIp;
  });

  // Mouse move handler for map container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top, containerWidth: rect.width });

    if (isPanning && panStartRef.current) {
      setMapPan({
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
      });
    }
  };

  const clampZoom = (value: number) => Math.min(6, Math.max(1, Number(value.toFixed(2))));

  const updateZoom = (nextZoom: number, mouseX?: number, mouseY?: number) => {
    const clamped = clampZoom(nextZoom);
    if (clamped === mapZoom) return;

    if (clamped === 1) {
      setMapZoom(1);
      setMapPan({ x: 0, y: 0 });
      return;
    }

    const container = mapContainerRef.current;
    if (!container) {
      setMapZoom(clamped);
      return;
    }

    const rect = container.getBoundingClientRect();
    const mX = mouseX !== undefined ? mouseX : mousePos.x || rect.width / 2;
    const mY = mouseY !== undefined ? mouseY : mousePos.y || rect.height / 2;

    const cx = mX - rect.width / 2;
    const cy = mY - rect.height / 2;
    const zoomRatio = clamped / mapZoom;

    setMapPan(prevPan => ({
      x: prevPan.x - cx * (zoomRatio - 1),
      y: prevPan.y - cy * (zoomRatio - 1),
    }));
    setMapZoom(clamped);
  };

  const focusCountryOnMap = (countryCode: string) => {
    const code = countryCode.toLowerCase();
    const pos = bubblePositions[code];
    const container = mapContainerRef.current;
    if (!pos || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const targetZoom = 3.5;
    setMapZoom(targetZoom);

    // Pan offset calculation to center target country in viewport
    const offsetX = (50 - pos.xPct) * (width / 100) * targetZoom;
    const offsetY = (50 - pos.yPct) * (height / 100) * targetZoom;

    setMapPan({ x: offsetX, y: offsetY });
  };

  const resetMapView = () => {
    setMapZoom(1);
    setMapPan({ x: 0, y: 0 });
    setIsPanning(false);
    panStartRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mapZoom <= 1) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: mapPan.x, panY: mapPan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsPanning(false);
    panStartRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const listener = (event: WheelEvent) => {
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      const mX = event.clientX - rect.left;
      const mY = event.clientY - rect.top;

      setMapZoom(currentZoom => {
        const delta = event.deltaY < 0 ? 0.25 : -0.25;
        const targetZoom = Math.min(6, Math.max(1, Number((currentZoom + delta).toFixed(2))));
        if (targetZoom === currentZoom) return currentZoom;

        if (targetZoom === 1) {
          setMapPan({ x: 0, y: 0 });
          return 1;
        }

        const cx = mX - rect.width / 2;
        const cy = mY - rect.height / 2;
        const zoomRatio = targetZoom / currentZoom;

        setMapPan(prevPan => ({
          x: prevPan.x - cx * (zoomRatio - 1),
          y: prevPan.y - cy * (zoomRatio - 1),
        }));

        return targetZoom;
      });
    };

    container.addEventListener('wheel', listener, { passive: false });
    return () => container.removeEventListener('wheel', listener);
  }, []);

  // Load SVG World Map and compute bubble positions
  useEffect(() => {
    const container = mapViewportRef.current;
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

        svgEl.setAttribute('viewBox', '0 0 2754 1398');
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        svgEl.style.display = 'block';

        const baseFill = mapTheme === 'dark' ? '#2a3b5c' : '#cbd5e1';
        const baseStroke = mapTheme === 'dark' ? '#486581' : '#94a3b8';

        const allPaths = svgEl.querySelectorAll('path');
        allPaths.forEach(path => {
          path.setAttribute('fill', baseFill);
          path.setAttribute('stroke', baseStroke);
          path.setAttribute('stroke-width', '0.75');
          path.style.transition = 'fill 0.3s ease, stroke 0.3s ease';
        });

        // Apply dynamic highlights based on telemetry status (bright electric indigo for live, pale for grace)
        countriesWithTelemetry.forEach(c => {
          const code = c.country_code.toLowerCase();
          const isLive = c.telemetry.status === 'LIVE_ACTIVE';
          const isGrace = c.telemetry.status === 'PALE_GRACE';

          const applyHighlight = (el: Element) => {
            const paths = el.tagName === 'g' ? el.querySelectorAll('path') : [el];
            paths.forEach(p => {
              if (p.tagName !== 'path') return;
              if (isLive) {
                (p as SVGPathElement).setAttribute('fill', mapTheme === 'dark' ? '#6366f1' : '#4f46e5');
                (p as SVGPathElement).setAttribute('stroke', mapTheme === 'dark' ? '#c7d2fe' : '#312e81');
                (p as SVGPathElement).setAttribute('stroke-width', '2.0');
                (p as SVGPathElement).style.filter = mapTheme === 'dark'
                  ? 'drop-shadow(0 0 14px rgba(99, 102, 241, 0.95))'
                  : 'drop-shadow(0 0 10px rgba(79, 70, 229, 0.6))';
              } else if (isGrace) {
                (p as SVGPathElement).setAttribute('fill', mapTheme === 'dark' ? '#475569' : '#94a3b8');
                (p as SVGPathElement).setAttribute('stroke', mapTheme === 'dark' ? '#94a3b8' : '#64748b');
                (p as SVGPathElement).setAttribute('stroke-width', '1.2');
                (p as SVGPathElement).style.filter = 'none';
              } else {
                (p as SVGPathElement).setAttribute('fill', baseFill);
                (p as SVGPathElement).setAttribute('stroke', baseStroke);
                (p as SVGPathElement).setAttribute('stroke-width', '0.75');
                (p as SVGPathElement).style.filter = 'none';
              }
            });
          };
          const byId = svgEl.querySelector(`#${code}`);
          if (byId) applyHighlight(byId);
          svgEl.querySelectorAll(`.${code}`).forEach(el => {
            if (el.tagName === 'path') applyHighlight(el);
          });
        });

        const existing = container.querySelector('svg.world-map-base');
        if (existing) existing.remove();

        svgEl.classList.add('world-map-base');
        container.prepend(svgEl);

        requestAnimationFrame(() => {
          const viewBoxW = 2754;
          const viewBoxH = 1398;
          const positions: Record<string, { xPct: number; yPct: number }> = {};

          countriesWithTelemetry.forEach(c => {
            const code = c.country_code.toLowerCase();
            const el = svgEl.querySelector(`#${code}`);
            if (!el) return;

            const paths: SVGGraphicsElement[] = [];
            if (el.tagName === 'g') {
              el.querySelectorAll('path').forEach(p => paths.push(p as SVGGraphicsElement));
            } else if (el.tagName === 'path') {
              paths.push(el as SVGGraphicsElement);
            }

            if (paths.length === 0) return;

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
     
  }, [topCountries, countriesWithTelemetry, mapTheme]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg overflow-hidden space-y-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-6 pt-5 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              {t('analytics.pageViews.countryBubbleMap') || 'Live Marketplace Visits by Country'}
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t('analytics.pageViews.geoLocation') || 'Real-time telemetry heartbeat & 30s grace timeout'}
            </p>
          </div>
        </div>

        {/* Telemetry Filter Toggle Mode & Map Style Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMapTheme('dark')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                mapTheme === 'dark' ? 'bg-slate-900 text-white shadow-sm font-black' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🌙 Dark Ocean
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('light')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                mapTheme === 'light' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ☀️ Light Crystal
            </button>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setTelemetryFilter('live_heartbeat')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                telemetryFilter === 'live_heartbeat'
                  ? 'bg-emerald-500 text-white shadow-md font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Live Heartbeat & 30s Grace
            </button>
            <button
              type="button"
              onClick={() => setTelemetryFilter('all_24h')}
              className={`px-3 py-1 rounded-lg transition-all ${
                telemetryFilter === 'all_24h'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All 24h Traffic
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI pills */}
      <div className="flex items-center gap-3 px-6 pb-3 flex-wrap border-b border-slate-100 dark:border-slate-800/80">
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
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{totalIpsCount}</span>
          <span className="text-[10px] text-slate-500">tracked IPs</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{activeNowCount}</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">ACTIVE NOW</span>
        </div>
        {paleGraceCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{paleGraceCount}</span>
            <span className="text-[10px] text-slate-500 font-semibold">PALE GRACE (30s timeout)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/40">
          <Gauge className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-bold text-purple-900 dark:text-purple-200">{marketConcentrationLabel}</span>
        </div>
        {displayedCountries[0] && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">{displayedCountries[0].flag_emoji} {displayedCountries[0].country_name}</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">{displayedCountries[0].share_pct}%</span>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className={`relative w-full overflow-hidden select-none transition-colors duration-300 ${mapZoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        style={{
          aspectRatio: '2754 / 1398',
          background: mapTheme === 'dark'
            ? 'radial-gradient(ellipse at center, #1c2541 0%, #0b132b 70%, #070a14 100%)'
            : 'radial-gradient(ellipse at center, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)',
        }}
        onMouseMove={handleMouseMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={mapViewportRef}
          className="absolute inset-0 transition-transform duration-200 ease-out"
          style={{ transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`, transformOrigin: '50% 50%' }}
        />
        {!svgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Globe className="w-8 h-8 text-indigo-400 animate-spin" />
              <span className="text-[10px] text-slate-500 font-semibold">Loading world map telemetry…</span>
            </div>
          </div>
        )}

        {/* Bubble Pins */}
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out"
          style={{ transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`, transformOrigin: '50% 50%' }}
        >
        {svgLoaded && displayedCountries.map((c) => {
          const code = c.country_code.toLowerCase();
          const pos = bubblePositions[code];
          if (!pos) return null;

          const isExpanded = expandedCountries[c.country_code];
          const isHovered = hoveredCountry?.country_code === c.country_code;
          const isLive = c.telemetry.status === 'LIVE_ACTIVE';
          const isGrace = c.telemetry.status === 'PALE_GRACE';

          // Compact bubble size
          const coreSize = Math.max(12, Math.min(22, Math.sqrt(c.share_pct || 1) * 3.5 + 8));
          const rippleSize = coreSize * 2.2;
          const glowSize = coreSize * 1.4;

          return (
            <div
              key={c.country_code}
              className={`absolute z-10 pointer-events-none transition-all duration-300 ${
                isGrace ? 'opacity-55' : 'opacity-100'
              }`}
              style={{
                left: `${pos.xPct}%`,
                top: `${pos.yPct}%`,
                width: `${coreSize}px`,
                height: `${coreSize}px`,
                transform: `translate(-50%, -50%) scale(${1 / mapZoom})`,
                transformOrigin: 'center',
              }}
            >
              {/* Active Ping Ripple: ONLY for live active visits, NOT for pale grace period */}
              {isLive && (
                <div
                  className="absolute rounded-full bg-indigo-400/30 animate-ping pointer-events-none"
                  style={{
                    width: `${rippleSize}px`,
                    height: `${rippleSize}px`,
                    top: `${(coreSize - rippleSize) / 2}px`,
                    left: `${(coreSize - rippleSize) / 2}px`,
                  }}
                />
              )}

              {/* Backdrop Glow: vibrant for live, pale/none for grace */}
              <div
                className={`absolute rounded-full pointer-events-none transition-all duration-200 ${
                  isLive
                    ? (isExpanded || isHovered ? 'bg-indigo-500/40 border border-indigo-300' : 'bg-indigo-500/20 border border-indigo-400/40')
                    : (isExpanded || isHovered ? 'bg-slate-500/40 border border-slate-300' : 'bg-slate-500/15 border border-slate-400/20')
                }`}
                style={{
                  width: `${glowSize}px`,
                  height: `${glowSize}px`,
                  top: `${(coreSize - glowSize) / 2}px`,
                  left: `${(coreSize - glowSize) / 2}px`,
                }}
              />

              {/* Core Bubble Button */}
              <div
                className={`relative w-full h-full rounded-full flex items-center justify-center text-white font-black shadow-md transition-all duration-200 cursor-pointer pointer-events-auto select-none border ${
                  isLive
                    ? (isExpanded || isHovered ? 'scale-150 border-amber-300 shadow-amber-500/50' : 'hover:scale-150 border-white shadow-indigo-500/50')
                    : (isExpanded || isHovered ? 'scale-150 border-slate-300 shadow-slate-500/50' : 'hover:scale-150 border-slate-400/60 shadow-slate-900/50')
                }`}
                style={{
                  background: isLive
                    ? (isExpanded ? 'linear-gradient(135deg, #f59e0b, #ec4899)' : 'linear-gradient(135deg, #a855f7, #6366f1)')
                    : 'linear-gradient(135deg, #64748b, #475569)',
                  fontSize: `${Math.max(6, coreSize * 0.45)}px`,
                  lineHeight: 1,
                }}
                onMouseEnter={() => setHoveredCountry(c)}
                onMouseLeave={() => setHoveredCountry(null)}
                onClick={() => toggleExpand(c.country_code)}
              >
                {coreSize >= 12 ? c.country_code.toUpperCase() : ''}
              </div>
            </div>
          );
        })}
        </div>

        {/* Zoom & navigation controls */}
        <div className="absolute right-4 top-4 z-30 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 text-white shadow-2xl backdrop-blur-md">
          <button type="button" onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); updateZoom(mapZoom + 0.25); }} className="p-2.5 hover:bg-white/10" title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); updateZoom(mapZoom - 0.25); }} className="p-2.5 hover:bg-white/10 border-t border-white/10" title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button type="button" onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); resetMapView(); }} className="p-2.5 hover:bg-white/10 border-t border-white/10" title="Reset map">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute right-4 top-36 z-30 hidden w-36 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white shadow-2xl backdrop-blur-md sm:block">
          <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-300">
            <span>Zoom</span>
            <span>{Math.round(mapZoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="6"
            step="0.1"
            value={mapZoom}
            onPointerDown={e => e.stopPropagation()}
            onChange={e => updateZoom(Number(e.target.value))}
            className="w-full accent-indigo-400"
          />
        </div>
        <div className="absolute left-4 bottom-4 z-30 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-[10px] font-bold text-slate-200 shadow-2xl backdrop-blur-md">
          <MousePointer2 className="h-3.5 w-3.5 text-indigo-300" />
          Scroll to zoom • Drag to pan • {Math.round(mapZoom * 100)}%
        </div>

        {/* Mouse Hover Tooltip */}
        {hoveredCountry && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{
              left: Math.min(mousePos.x + 16, mousePos.containerWidth - 230),
              top: Math.max(mousePos.y - 10, 8),
            }}
          >
            <div className="p-3 rounded-xl border border-indigo-500/40 bg-slate-900/95 text-white shadow-2xl shadow-indigo-500/20 backdrop-blur-lg w-56 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{hoveredCountry.flag_emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-sm text-white truncate">{hoveredCountry.country_name}</p>
                    {hoveredCountry.telemetry?.status === 'LIVE_ACTIVE' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500 text-slate-950 uppercase">
                        LIVE
                      </span>
                    )}
                    {hoveredCountry.telemetry?.status === 'PALE_GRACE' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-700 text-slate-300 uppercase">
                        PALE ({hoveredCountry.telemetry.graceTimeRemainingSec}s)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400">{hoveredCountry.country_code} &bull; {hoveredCountry.ip_addresses?.length || 0} IPs</span>
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

      {/* Traffic & IP Telemetry Controls Header */}
      <div className="p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span>Traffic & Visitor IP Breakdown by Region</span>
              <span className="text-[10px] font-normal text-slate-500 font-mono">
                ({filteredCountries.length} countries displayed)
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Click any country to expand visitor IP addresses, ISP origins, and active session decay timers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search IP or Country..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-44"
              />
            </div>

            {/* Global Expand/Collapse All */}
            <button
              onClick={toggleExpandAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
            >
              {allExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  Collapse All
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  Expand All IPs
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Country Rows */}
        <div className="space-y-3 pt-1">
          {filteredCountries.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs font-semibold">
              No live active or cooling regions matching &quot;{searchTerm}&quot;
            </div>
          ) : (
            filteredCountries.map((c, i) => {
              const isExpanded = expandedCountries[c.country_code];
              const barWidth = totalViews > 0 ? (c.views_count / totalViews) * 100 : 0;
              const ipsList = c.ip_addresses || [];
              const isLive = c.telemetry.status === 'LIVE_ACTIVE';
              const isGrace = c.telemetry.status === 'PALE_GRACE';

              return (
                <div
                  key={c.country_code}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-indigo-300 dark:border-indigo-700/80 bg-white dark:bg-slate-800/90 shadow-md'
                      : isGrace
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 opacity-75'
                      : 'border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                  onMouseEnter={() => setHoveredCountry(c)}
                  onMouseLeave={() => setHoveredCountry(null)}
                >
                  {/* Row Header Bar (Clickable to toggle expansion) */}
                  <div
                    onClick={() => toggleExpand(c.country_code)}
                    className="p-3.5 flex items-center gap-3 cursor-pointer select-none"
                  >
                    {/* Rank */}
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                      i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                      i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' :
                      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {i + 1}
                    </span>

                    {/* Flag */}
                    <span className="text-lg flex-shrink-0">{c.flag_emoji}</span>

                    {/* Name + status badge + progress bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {c.country_name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                            {c.country_code}
                          </span>
                          {isLive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 uppercase">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                              LIVE ACTIVE
                            </span>
                          )}
                          {isGrace && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center gap-1 uppercase">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              PALE GRACE ({c.telemetry.graceTimeRemainingSec}s)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {c.views_count.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">views</span>
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-black">
                            {c.share_pct}%
                          </span>
                        </div>
                      </div>

                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            background: isLive
                              ? (i === 0 ? 'linear-gradient(90deg, #6366f1, #a855f7)' : 'linear-gradient(90deg, #818cf8, #c084fc)')
                              : 'linear-gradient(90deg, #94a3b8, #64748b)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Focus on Map Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        focusCountryOnMap(c.country_code);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex-shrink-0"
                      title={`Zoom & focus ${c.country_name} on map`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>

                    {/* Expand/Collapse Button */}
                    <button
                      type="button"
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex-shrink-0 ${
                        isExpanded
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Wifi className="w-3 h-3 text-indigo-500" />
                      <span>{ipsList.length} IPs</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expanded IP Address List Drawer */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/60 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1 pt-1">
                        <span className="uppercase tracking-wider">Active Visitor IP Addresses ({ipsList.length})</span>
                        <span>Click IP to copy</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ipsList.map((ipItem, ipIdx) => {
                          const isCopied = copiedIp === ipItem.ip;
                          return (
                            <div
                              key={ipIdx}
                              className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 flex items-center justify-between gap-2 shadow-sm hover:border-indigo-300 transition-colors"
                            >
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  {/* IP Address */}
                                  <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                                    {ipItem.ip}
                                  </span>

                                  {/* Copy Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyIp(ipItem.ip);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    title="Copy IP Address"
                                  >
                                    {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  </button>

                                  {/* Active Status Badge */}
                                  {ipItem.is_active_now ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                      ACTIVE NOW
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                                      GRACE / RECENT
                                    </span>
                                  )}
                                </div>

                                {/* Location & ISP */}
                                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                                  {ipItem.city ? `${ipItem.city} • ` : ''}{ipItem.isp || 'Internet Service Provider'}
                                </p>

                                {/* Device Type */}
                                {ipItem.device_type && (
                                  <p className="text-[10px] text-slate-400 font-medium truncate">
                                    {ipItem.device_type}
                                  </p>
                                )}
                              </div>

                              {/* IP Views Count */}
                              <div className="text-right flex-shrink-0">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                  {ipItem.views_count.toLocaleString()}
                                </span>
                                <p className="text-[9px] text-slate-400 font-semibold">views</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
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
                        <StoreHoverCard
                          store={{
                            store_name: prod.store_name,
                            store_host: prod.store_host,
                            store_logo_url: prod.store_logo_url,
                            store_description: prod.store_description,
                            store_status: prod.store_status,
                            subscription_plan: prod.subscription_plan,
                          }}
                        >
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
                        <StoreHoverCard
                          store={{
                            store_name: prod.store_name,
                            store_host: prod.store_host,
                            store_logo_url: prod.store_logo_url,
                            store_description: prod.store_description,
                            store_status: prod.store_status,
                            subscription_plan: prod.subscription_plan,
                          }}
                        >
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

