import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { getRedis } from '../db/redis';

const CACHE_KEY = 'pd:maintenance:config';
const CACHE_TTL_SECONDS = 15;

interface MaintenanceConfig {
  maintenance_enabled: boolean;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_eta: string;
  maintenance_allowed_ips: string;
  maintenance_block_storefronts: boolean;
}

const MAINTENANCE_KEYS = [
  'maintenance_enabled',
  'maintenance_title',
  'maintenance_message',
  'maintenance_eta',
  'maintenance_allowed_ips',
  'maintenance_block_storefronts',
];

const DEFAULT_CONFIG: MaintenanceConfig = {
  maintenance_enabled: false,
  maintenance_title: 'Maintenance en cours',
  maintenance_message: 'Notre plateforme est en cours de maintenance. Nous serons de retour très bientôt.',
  maintenance_eta: '',
  maintenance_allowed_ips: '',
  maintenance_block_storefronts: false,
};

async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  try {
    const cached = await getRedis().get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable — fall through to DB
  }

  const { rows } = await query<{ key: string; value: string }>(
    `SELECT key, value FROM pd_platform_config WHERE key = ANY($1::text[])`,
    [MAINTENANCE_KEYS],
  );

  const config: MaintenanceConfig = { ...DEFAULT_CONFIG };
  for (const row of rows) {
    if (row.key === 'maintenance_enabled') config.maintenance_enabled = row.value === 'true';
    else if (row.key === 'maintenance_block_storefronts') config.maintenance_block_storefronts = row.value === 'true';
    else if (row.key in config) (config as unknown as Record<string, string | boolean>)[row.key] = row.value;
  }

  try {
    await getRedis().setex(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(config));
  } catch {
    // Redis unavailable — proceed without cache
  }

  return config;
}

function isAllowedIp(clientIp: string | undefined, allowedIps: string): boolean {
  if (!clientIp || !allowedIps.trim()) return false;
  const normalizedClient = clientIp.replace(/^::ffff:/, '');
  const allowed = allowedIps.split(',').map((ip) => ip.trim()).filter(Boolean);
  return allowed.some((ip) => ip === normalizedClient || ip === clientIp);
}

const BYPASS_PATH_PREFIXES = [
  '/api/pd/admin/',
  '/api/pd/auth/',
  '/api/pd/marketplace/settings',
  '/health',
  '/ready',
  '/metrics',
  '/api/docs',
];

export function maintenanceMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    if (BYPASS_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next();
    }

    let config: MaintenanceConfig;
    try {
      config = await getMaintenanceConfig();
    } catch {
      return next();
    }

    if (!config.maintenance_enabled) {
      return next();
    }

    const userRole = req.user?.role;
    if (userRole === 'admin' || userRole === 'super_admin') {
      return next();
    }

    if (isAllowedIp(req.ip, config.maintenance_allowed_ips)) {
      return next();
    }

    res.status(503).json({
      error: {
        code: 'MAINTENANCE_MODE',
        title: config.maintenance_title,
        message: config.maintenance_message,
        eta: config.maintenance_eta || null,
        block_storefronts: config.maintenance_block_storefronts,
      },
    });
  };
}

export function invalidateMaintenanceCache() {
  try {
    getRedis().del(CACHE_KEY);
  } catch {
    // Ignore
  }
}
