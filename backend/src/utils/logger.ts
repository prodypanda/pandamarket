/**
 * Structured logger using pino.
 * Use this everywhere instead of `console.log`.
 */

import pino from 'pino';
import { config } from '../config';

const isDev = config.env === 'development';

export const logger = pino({
  level: config.logLevel,
  base: { service: 'backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname,service',
      },
    },
  }),
  // Redact sensitive fields automatically
  redact: {
    paths: [
      '*.password',
      '*.password_hash',
      '*.token',
      '*.access_token',
      '*.refresh_token',
      '*.api_key',
      '*.secret',
      '*.flouci_app_secret',
      '*.konnect_api_key',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});

/**
 * Create a child logger with extra static fields (e.g. request_id, store_id).
 */
export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
