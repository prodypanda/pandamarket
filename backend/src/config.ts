/**
 * Centralised configuration loaded from environment variables.
 * All env vars MUST be prefixed with `PD_`.
 *
 * Supports Docker Secrets: if a `_FILE` suffixed env var exists
 * (e.g. `PD_JWT_SECRET_FILE=/run/secrets/jwt_secret`), the file
 * contents are read and used as the value. This allows production
 * deployments to use Docker Secrets, Vault Agent injected files,
 * or Kubernetes Secrets mounted as volumes — without changing code.
 *
 * Priority: _FILE env var > plain env var > fallback
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env early
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Read a Docker Secret / file-based secret.
 * Checks for `{name}_FILE` env var pointing to a file path,
 * reads and trims the file content if it exists.
 */
function readSecretFile(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (!filePath) return undefined;
  try {
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // In production, a missing secret file is a fatal misconfiguration
    if (process.env.PD_NODE_ENV === 'production') {
      throw new Error(`Failed to read secret file for ${name} at ${filePath}: ${msg}`);
    }
    return undefined;
  }
}

function required(name: string, fallback?: string): string {
  const value = readSecretFile(name) ?? process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback?: string): string | undefined {
  return readSecretFile(name) ?? process.env[name] ?? fallback;
}

function asInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) throw new Error(`Invalid integer for ${name}: ${raw}`);
  return n;
}

function asBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw.toLowerCase() === 'true' || raw === '1';
}

function asList(name: string, fallback: string[] = []): string[] {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

const runtimeEnv = process.env.PD_NODE_ENV || process.env.NODE_ENV;
const envFallback = runtimeEnv === 'production' ? 'production' : 'development';

export const config = {
  // App
  env: optional('PD_NODE_ENV', envFallback) as 'development' | 'production' | 'test',
  port: asInt('PORT', asInt('PD_PORT', 9000)),
  logLevel: optional('PD_LOG_LEVEL', 'info'),
  hubDomain: optional('PD_HUB_DOMAIN', 'pandamarket.local')!,
  adminCors: asList('PD_ADMIN_CORS', ['http://localhost:3000']),
  storeCors: asList('PD_STORE_CORS', ['http://localhost:3000']),
  runWorkersInProcess: asBool('PD_RUN_WORKERS_IN_PROCESS', true),

  // Database
  databaseUrl: required('PD_DATABASE_URL'),
  databasePoolSize: asInt('PD_DATABASE_POOL_SIZE', 20),
  databaseSsl: asBool('PD_DATABASE_SSL', process.env.NODE_ENV === 'production' || process.env.PD_NODE_ENV === 'production' || (process.env.PD_DATABASE_URL ?? '').includes('supabase')),

  // Redis
  redisUrl: required('PD_REDIS_URL', 'redis://localhost:6379'),

  // S3
  s3: {
    endpoint: optional('PD_S3_ENDPOINT', 'http://localhost:9100')!,
    forcePathStyle: asBool('PD_S3_FORCE_PATH_STYLE', true),
    bucketPublic: optional('PD_S3_BUCKET_PUBLIC', 'pd-product-images')!,
    bucketPrivate: optional('PD_S3_BUCKET_PRIVATE', 'pd-private-files')!,
    bucketThemes: optional('PD_S3_BUCKET_THEMES', 'pd-themes')!,
    accessKey: required('PD_S3_ACCESS_KEY', 'minioadmin'),
    secretKey: required('PD_S3_SECRET_KEY', 'minioadmin'),
    region: optional('PD_S3_REGION', 'us-east-1')!,
    publicBaseUrl: optional('PD_S3_PUBLIC_BASE_URL', '/pd-product-images')!,
  },

  // Auth
  jwt: {
    secret: required('PD_JWT_SECRET', 'dev_jwt_secret_change_in_production'),
    accessExpiresIn: optional('PD_JWT_ACCESS_EXPIRES_IN', '15m')!,
    refreshExpiresIn: optional('PD_JWT_REFRESH_EXPIRES_IN', '7d')!,
  },
  cookieSecret: required('PD_COOKIE_SECRET', 'dev_cookie_secret_change_in_production'),
  bcryptRounds: asInt('PD_BCRYPT_ROUNDS', 12),

  // Encryption
  encryptionKey: required(
    'PD_ENCRYPTION_KEY',
    '0000000000000000000000000000000000000000000000000000000000000000',
  ),

  // Meilisearch
  meili: {
    host: optional('PD_MEILI_HOST', 'http://localhost:7700')!,
    masterKey: required('PD_MEILI_MASTER_KEY', 'meili_master_dev_key'),
    productsIndex: optional('PD_MEILI_PRODUCTS_INDEX', 'products')!,
  },

  // Payments
  flouci: {
    baseUrl: optional('PD_FLOUCI_BASE_URL', 'https://developers.flouci.com/api')!,
    appToken: optional('PD_FLOUCI_APP_TOKEN', 'sandbox_token')!,
    appSecret: optional('PD_FLOUCI_APP_SECRET', 'sandbox_secret')!,
  },
  konnect: {
    baseUrl: optional('PD_KONNECT_BASE_URL', 'https://api.preprod.konnect.network/api/v2')!,
    apiKey: optional('PD_KONNECT_API_KEY', 'sandbox_key')!,
    receiverWallet: optional('PD_KONNECT_RECEIVER_WALLET', 'sandbox_wallet')!,
  },
  paypal: {
    clientId: optional('PD_PAYPAL_CLIENT_ID', '')!,
    clientSecret: optional('PD_PAYPAL_CLIENT_SECRET', '')!,
    mode: (optional('PD_PAYPAL_MODE', 'sandbox') || 'sandbox') as 'sandbox' | 'live',
    webhookId: optional('PD_PAYPAL_WEBHOOK_ID', '')!,
  },

  // Shipping carriers. External adapters are enabled only when their
  // provider-specific BASE_URL and API_KEY are configured. Simulation is a
  // development fallback and is disabled by default in production.
  shipping: {
    simulationFallback: asBool('PD_SHIPPING_SIMULATION_FALLBACK', envFallback !== 'production'),
    requestTimeoutMs: Math.max(1000, asInt('PD_SHIPPING_REQUEST_TIMEOUT_MS', 8000)),
    maxAttempts: Math.min(8, Math.max(1, asInt('PD_SHIPPING_MAX_ATTEMPTS', 3))),
  },

  // AI
  gemini: {
    apiKey: optional('PD_GEMINI_API_KEY', process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')!,
    model: optional('PD_GEMINI_MODEL', process.env.GEMINI_MODEL || 'gemini-1.5-flash')!,
    maxTokens: asInt('PD_GEMINI_MAX_TOKENS', 500),
  },
  openai: {
    apiKey: optional('PD_OPENAI_API_KEY', process.env.OPENAI_API_KEY || '')!,
    model: optional('PD_OPENAI_MODEL', process.env.OPENAI_MODEL || 'gpt-4o-mini')!,
  },

  // Mail
  smtp: {
    host: optional('PD_SMTP_HOST', '')!,
    port: asInt('PD_SMTP_PORT', 587),
    user: optional('PD_SMTP_USER', '')!,
    pass: optional('PD_SMTP_PASS', '')!,
  },
  mailFrom: optional('PD_MAIL_FROM', 'PandaMarket <noreply@pandamarket.tn>')!,

  // SMS (Phone verification)
  sms: {
    provider: optional('PD_SMS_PROVIDER', 'console') as 'twilio' | 'infobip' | 'console',
    twilioAccountSid: optional('PD_TWILIO_ACCOUNT_SID', ''),
    twilioAuthToken: optional('PD_TWILIO_AUTH_TOKEN', ''),
    twilioFromNumber: optional('PD_TWILIO_FROM_NUMBER', ''),
    infobipApiKey: optional('PD_INFOBIP_API_KEY', ''),
    infobipBaseUrl: optional('PD_INFOBIP_BASE_URL', 'https://api.infobip.com'),
  },

  // Observability
  sentryDsn: optional('PD_SENTRY_DSN', ''),
  metricsEnabled: asBool('PD_METRICS_ENABLED', false),

  // Misc
  defaultRetentionDays: asInt('PD_DEFAULT_RETENTION_DAYS', 7),
  defaultCurrency: optional('PD_DEFAULT_CURRENCY', 'TND')!,
  minWithdrawalTnd: asInt('PD_MIN_WITHDRAWAL_TND', 20),
  autoPayoutsEnabled: asBool('PD_PAYOUTS_AUTO_ENABLED', false),
} as const;

if (config.env === 'production') {
  const criticalSecrets: Array<{ name: string; devDefault: string }> = [
    { name: 'PD_JWT_SECRET', devDefault: 'dev_jwt_secret_change_in_production' },
    { name: 'PD_COOKIE_SECRET', devDefault: 'dev_cookie_secret_change_in_production' },
    {
      name: 'PD_ENCRYPTION_KEY',
      devDefault: '0000000000000000000000000000000000000000000000000000000000000000',
    },
  ];
  for (const { name, devDefault } of criticalSecrets) {
    const provided = readSecretFile(name) ?? process.env[name];
    if (!provided || provided === devDefault) {
      // Fail fast: booting with known dev defaults would allow JWT/cookie forgery
      // and decryption of vendor payment configs.
      throw new Error(
        `[config] Refusing to start in production: ${name} is missing or set to the insecure development default. Set the environment variable (or ${name}_FILE) to a strong secret.`,
      );
    }
  }
  const warnIfDefault = (name: string, value: string, devDefault: string) => {
    if (value === devDefault) {
      console.warn(`[config] WARNING: ${name} is using the public sandbox default in production.`);
    }
  };
  warnIfDefault('PD_FLOUCI_APP_TOKEN', config.flouci.appToken, 'sandbox_token');
  warnIfDefault('PD_FLOUCI_APP_SECRET', config.flouci.appSecret, 'sandbox_secret');
  warnIfDefault('PD_KONNECT_API_KEY', config.konnect.apiKey, 'sandbox_key');
}

export type AppConfig = typeof config;
