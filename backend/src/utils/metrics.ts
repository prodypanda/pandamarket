/**
 * Prometheus metrics middleware for PandaMarket.
 *
 * Exposes metrics at GET /metrics (Prometheus scrape endpoint).
 * Tracks:
 *   - HTTP request duration (histogram)
 *   - HTTP request count (counter, by method/route/status)
 *   - Active connections (gauge)
 *   - BullMQ job metrics (counter by queue/status)
 *   - Business metrics (orders, payments, registrations)
 *
 * Disabled when PD_METRICS_ENABLED is not 'true'.
 */

import { Request, Response, NextFunction, RequestHandler, Router } from 'express';
import { config } from '../config';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// In-memory metric stores (no external dependency required)
// ---------------------------------------------------------------------------

interface HistogramBucket {
  le: number;
  count: number;
}

interface HistogramMetric {
  labels: Record<string, string>;
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

interface CounterMetric {
  labels: Record<string, string>;
  value: number;
}

interface GaugeMetric {
  labels: Record<string, string>;
  value: number;
}

// Default histogram buckets (seconds)
const HTTP_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// Stores
const httpDurationHistograms: HistogramMetric[] = [];
const httpRequestCounters: CounterMetric[] = [];
const gauges: Map<string, GaugeMetric> = new Map();
const businessCounters: Map<string, CounterMetric> = new Map();

let activeConnections = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findOrCreateHistogram(labels: Record<string, string>): HistogramMetric {
  const key = JSON.stringify(labels);
  let h = httpDurationHistograms.find((m) => JSON.stringify(m.labels) === key);
  if (!h) {
    h = {
      labels,
      buckets: HTTP_BUCKETS.map((le) => ({ le, count: 0 })),
      sum: 0,
      count: 0,
    };
    httpDurationHistograms.push(h);
  }
  return h;
}

function findOrCreateCounter(store: CounterMetric[], labels: Record<string, string>): CounterMetric {
  const key = JSON.stringify(labels);
  let c = store.find((m) => JSON.stringify(m.labels) === key);
  if (!c) {
    c = { labels, value: 0 };
    store.push(c);
  }
  return c;
}

function normaliseRoute(req: Request): string {
  // Use Express route pattern if available, otherwise collapse IDs
  const route = req.route?.path;
  if (route) return route;
  // Collapse UUIDs and numeric IDs in the path
  return req.path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/pd_[a-zA-Z0-9_]+/g, '/:id');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Express middleware that records HTTP request duration and count.
 */
export const metricsMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!config.metricsEnabled) return next();

  activeConnections++;
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    activeConnections--;
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;

    const labels = {
      method: req.method,
      route: normaliseRoute(req),
      status: String(res.statusCode),
    };

    // Histogram
    const h = findOrCreateHistogram(labels);
    h.sum += durationSec;
    h.count++;
    for (const bucket of h.buckets) {
      if (durationSec <= bucket.le) bucket.count++;
    }

    // Counter
    const c = findOrCreateCounter(httpRequestCounters, labels);
    c.value++;
  });

  next();
};

/**
 * Increment a business metric counter.
 * Examples: incrementBusinessMetric('orders_created'), incrementBusinessMetric('payments_captured', { gateway: 'flouci' })
 */
export function incrementBusinessMetric(name: string, labels: Record<string, string> = {}): void {
  if (!config.metricsEnabled) return;
  const key = `${name}:${JSON.stringify(labels)}`;
  let c = businessCounters.get(key);
  if (!c) {
    c = { labels: { ...labels, metric: name }, value: 0 };
    businessCounters.set(key, c);
  }
  c.value++;
}

/**
 * Set a gauge value.
 */
export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
  if (!config.metricsEnabled) return;
  const key = `${name}:${JSON.stringify(labels)}`;
  gauges.set(key, { labels: { ...labels, metric: name }, value });
}

// ---------------------------------------------------------------------------
// Prometheus text format serialiser
// ---------------------------------------------------------------------------

function formatLabels(labels: Record<string, string>): string {
  const parts = Object.entries(labels).map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`);
  return parts.length > 0 ? `{${parts.join(',')}}` : '';
}

function serialiseMetrics(): string {
  const lines: string[] = [];

  // HTTP request duration histogram
  if (httpDurationHistograms.length > 0) {
    lines.push('# HELP pd_http_request_duration_seconds HTTP request duration in seconds');
    lines.push('# TYPE pd_http_request_duration_seconds histogram');
    for (const h of httpDurationHistograms) {
      const base = formatLabels(h.labels);
      for (const b of h.buckets) {
        lines.push(`pd_http_request_duration_seconds_bucket{${base.slice(1, -1)},le="${b.le}"} ${b.count}`);
      }
      lines.push(`pd_http_request_duration_seconds_bucket{${base.slice(1, -1)},le="+Inf"} ${h.count}`);
      lines.push(`pd_http_request_duration_seconds_sum${base} ${h.sum}`);
      lines.push(`pd_http_request_duration_seconds_count${base} ${h.count}`);
    }
  }

  // HTTP request count
  if (httpRequestCounters.length > 0) {
    lines.push('# HELP pd_http_requests_total Total HTTP requests');
    lines.push('# TYPE pd_http_requests_total counter');
    for (const c of httpRequestCounters) {
      lines.push(`pd_http_requests_total${formatLabels(c.labels)} ${c.value}`);
    }
  }

  // Active connections gauge
  lines.push('# HELP pd_http_active_connections Current active HTTP connections');
  lines.push('# TYPE pd_http_active_connections gauge');
  lines.push(`pd_http_active_connections ${activeConnections}`);

  // Business counters
  if (businessCounters.size > 0) {
    lines.push('# HELP pd_business_events_total Business event counters');
    lines.push('# TYPE pd_business_events_total counter');
    for (const c of businessCounters.values()) {
      lines.push(`pd_business_events_total${formatLabels(c.labels)} ${c.value}`);
    }
  }

  // Custom gauges
  if (gauges.size > 0) {
    lines.push('# HELP pd_gauge Custom gauge metrics');
    lines.push('# TYPE pd_gauge gauge');
    for (const g of gauges.values()) {
      lines.push(`pd_gauge${formatLabels(g.labels)} ${g.value}`);
    }
  }

  // Node.js process metrics
  const mem = process.memoryUsage();
  lines.push('# HELP pd_nodejs_heap_used_bytes Node.js heap used');
  lines.push('# TYPE pd_nodejs_heap_used_bytes gauge');
  lines.push(`pd_nodejs_heap_used_bytes ${mem.heapUsed}`);

  lines.push('# HELP pd_nodejs_heap_total_bytes Node.js heap total');
  lines.push('# TYPE pd_nodejs_heap_total_bytes gauge');
  lines.push(`pd_nodejs_heap_total_bytes ${mem.heapTotal}`);

  lines.push('# HELP pd_nodejs_rss_bytes Node.js RSS');
  lines.push('# TYPE pd_nodejs_rss_bytes gauge');
  lines.push(`pd_nodejs_rss_bytes ${mem.rss}`);

  lines.push('# HELP pd_nodejs_external_bytes Node.js external memory');
  lines.push('# TYPE pd_nodejs_external_bytes gauge');
  lines.push(`pd_nodejs_external_bytes ${mem.external}`);

  const uptime = process.uptime();
  lines.push('# HELP pd_process_uptime_seconds Process uptime');
  lines.push('# TYPE pd_process_uptime_seconds gauge');
  lines.push(`pd_process_uptime_seconds ${uptime}`);

  return lines.join('\n') + '\n';
}

/**
 * Create a router that exposes GET /metrics for Prometheus scraping.
 */
export function metricsRouter(): Router {
  const router = Router();

  router.get('/metrics', (_req: Request, res: Response) => {
    if (!config.metricsEnabled) {
      res.status(404).json({ error: 'Metrics not enabled' });
      return;
    }
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(serialiseMetrics());
  });

  return router;
}

/**
 * Log that metrics are enabled/disabled at startup.
 */
export function logMetricsStatus(): void {
  if (config.metricsEnabled) {
    logger.info('Prometheus metrics enabled at GET /metrics');
  } else {
    logger.info('Prometheus metrics disabled (set PD_METRICS_ENABLED=true to enable)');
  }
}
