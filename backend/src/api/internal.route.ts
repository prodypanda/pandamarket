/**
 * Internal API routes — not exposed to the public.
 * Used by infrastructure components (e.g. Caddy on-demand TLS).
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares';
import { storeService } from '../services/store.service';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/pd/internal/tls-allowed?domain=example.com
 *
 * Called by Caddy's `on_demand_tls.ask` directive before issuing a certificate.
 * Returns 200 if the domain belongs to a registered store (custom_domain),
 * or 404 otherwise (Caddy will NOT request a cert for unknown domains).
 *
 * This prevents certificate flooding attacks where an attacker points
 * arbitrary domains at our server to exhaust Let's Encrypt rate limits.
 */
router.get(
  '/tls-allowed',
  asyncHandler(async (req: Request, res: Response) => {
    const domain = (req.query.domain as string | undefined)?.toLowerCase()?.trim();
    if (!domain) {
      res.status(400).json({ allowed: false, reason: 'Missing domain parameter' });
      return;
    }

    // Always allow the hub domain and its subdomains
    const hubDomain = config.hubDomain.toLowerCase();
    if (domain === hubDomain || domain.endsWith(`.${hubDomain}`)) {
      res.status(200).json({ allowed: true, reason: 'Hub domain' });
      return;
    }

    // Check if this is a registered custom domain
    const store = await storeService.getByCustomDomain(domain);
    if (store) {
      logger.info({ domain, store_id: store.id }, 'TLS allowed for custom domain');
      res.status(200).json({ allowed: true, store_id: store.id });
      return;
    }

    logger.warn({ domain }, 'TLS denied for unknown domain');
    res.status(404).json({ allowed: false, reason: 'Domain not registered' });
  }),
);

export default router;
