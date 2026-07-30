/**
 * Marketplace Analytics Event Service — First-party event collection for
 * checkout funnel, storefront engagement, search analytics, and seller lifecycle.
 *
 * Privacy-first: visitor/session IDs are hashed with SHA-256 before storage.
 * Search queries are normalized and hashed. No raw IPs, no raw emails stored.
 * All insertions are best-effort — failures are logged but never throw.
 */

import { query } from '../db/pool';
import { pdId, sha256 } from '../utils/crypto';
import { logger } from '../utils/logger';

// =====================================================
// Event Taxonomy
// =====================================================

export const MARKETPLACE_EVENT_TYPES = [
  // Checkout funnel
  'checkout_started',
  'checkout_address_submitted',
  'checkout_shipping_selected',
  'checkout_payment_started',
  'checkout_payment_completed',
  'checkout_failed',
  // Storefront / product / category
  'storefront_view',
  'product_view',
  'product_click',
  'category_view',
  'add_to_cart',
  'cart_view',
  // Search
  'search_performed',
  'search_result_clicked',
  'zero_result_search',
  // Seller lifecycle
  'seller_registered',
  'store_created',
  'store_published',
  'kyc_submitted',
  'kyc_approved',
  'kyc_rejected',
  'product_created',
  'product_published',
  'payment_configured',
  'first_order_received',
  'first_payout_completed',
] as const;

export type MarketplaceEventType = (typeof MARKETPLACE_EVENT_TYPES)[number];

const VALID_EVENT_SET = new Set<string>(MARKETPLACE_EVENT_TYPES);

// =====================================================
// Interfaces
// =====================================================

export interface InsertEventParams {
  event_type: MarketplaceEventType;
  user_id?: string | null;
  store_id?: string | null;
  product_id?: string | null;
  category_id?: string | null;
  order_id?: string | null;
  visitor_id?: string | null;
  session_id?: string | null;
  referrer?: string | null;
  locale?: string | null;
  user_agent?: string | null;
  source?: string;
  path?: string | null;
  search_query?: string | null;
  search_results_count?: number | null;
  funnel_step?: string | null;
  metadata?: Record<string, unknown> | null;
}

// =====================================================
// Helpers
// =====================================================

const MAX_METADATA_BYTES = 4096;

function extractDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.slice(0, 255);
  } catch {
    return null;
  }
}

function detectDeviceType(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const lower = ua.toLowerCase();
  if (/tablet|ipad/.test(lower)) return 'tablet';
  if (/mobile|iphone|android.*mobile/.test(lower)) return 'mobile';
  return 'desktop';
}

/**
 * Normalize a search query for privacy-safe storage:
 * - trim, lowercase, collapse whitespace
 * - strip email-like and phone-like patterns
 * - cap at 200 characters
 */
function normalizeSearchQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let q = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  // Strip email-like patterns
  q = q.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[redacted]');
  // Strip phone-like patterns (10+ digits)
  q = q.replace(/\b\d{10,}\b/g, '[redacted]');
  return q.slice(0, 200) || null;
}

// =====================================================
// Service
// =====================================================

export class MarketplaceAnalyticsEventService {
  static isValidEventType(type: string): type is MarketplaceEventType {
    return VALID_EVENT_SET.has(type);
  }

  isValidEventType(type: string): type is MarketplaceEventType {
    return MarketplaceAnalyticsEventService.isValidEventType(type);
  }

  /**
   * Insert a marketplace analytics event. Best-effort: logs errors, never throws.
   */
  async insertMarketplaceEvent(params: InsertEventParams): Promise<void> {
    try {
      if (!MarketplaceAnalyticsEventService.isValidEventType(params.event_type)) {
        logger.warn({ event_type: params.event_type }, 'Rejected unknown marketplace event type');
        return;
      }

      // Enforce metadata size limit
      const metadataJson = params.metadata ? JSON.stringify(params.metadata) : '{}';
      if (Buffer.byteLength(metadataJson, 'utf8') > MAX_METADATA_BYTES) {
        logger.warn({ event_type: params.event_type }, 'Rejected oversized event metadata (>4KB)');
        return;
      }

      const visitorHash = params.visitor_id ? sha256(params.visitor_id) : null;
      const sessionHash = params.session_id ? sha256(params.session_id) : null;
      const referrerDomain = extractDomain(params.referrer);
      const deviceType = detectDeviceType(params.user_agent);
      const normalizedQuery = normalizeSearchQuery(params.search_query);
      const searchQueryHash = normalizedQuery ? sha256(normalizedQuery) : null;

      await query(
        `INSERT INTO pd_marketplace_analytics_event (
          id, event_type, user_id, store_id, product_id, category_id, order_id,
          visitor_hash, session_hash, referrer_domain, locale, device_type,
          source, path, search_query_hash, search_query_normalized,
          search_results_count, funnel_step, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19::jsonb
        )`,
        [
          pdId('mae'),
          params.event_type,
          params.user_id || null,
          params.store_id || null,
          params.product_id || null,
          params.category_id || null,
          params.order_id || null,
          visitorHash,
          sessionHash,
          referrerDomain,
          params.locale?.slice(0, 10) || null,
          deviceType,
          params.source || 'web',
          params.path?.slice(0, 2048) || null,
          searchQueryHash,
          normalizedQuery,
          params.search_results_count ?? null,
          params.funnel_step?.slice(0, 64) || null,
          metadataJson,
        ],
      );
    } catch (err) {
      logger.error({ err, event_type: params.event_type }, 'Failed to insert marketplace analytics event');
    }
  }

  /**
   * Insert a first-time lifecycle event idempotently.
   * Only inserts if no event of the same type exists for the given user/store.
   */
  async insertFirstTimeEvent(params: InsertEventParams): Promise<void> {
    try {
      if (!MarketplaceAnalyticsEventService.isValidEventType(params.event_type)) {
        return;
      }

      const conditions: string[] = ['event_type = $1'];
      const checkParams: (string | null)[] = [params.event_type];
      let idx = 2;

      if (params.user_id) {
        conditions.push(`user_id = $${idx}`);
        checkParams.push(params.user_id);
        idx++;
      }
      if (params.store_id) {
        conditions.push(`store_id = $${idx}`);
        checkParams.push(params.store_id);
        idx++;
      }

      const { rows } = await query(
        `SELECT 1 FROM pd_marketplace_analytics_event WHERE ${conditions.join(' AND ')} LIMIT 1`,
        checkParams,
      );

      if (rows.length > 0) {
        return; // Already recorded
      }

      await this.insertMarketplaceEvent(params);
    } catch (err) {
      logger.error({ err, event_type: params.event_type }, 'Failed to insert first-time lifecycle event');
    }
  }
}

export const marketplaceAnalyticsEventService = new MarketplaceAnalyticsEventService();
