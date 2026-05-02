/**
 * Crypto utilities — AES-256-GCM for sensitive data,
 * SHA-256 for API keys, and ID generation with `pd_` prefix.
 *
 * Used for:
 *   - Encrypting vendor payment provider keys (Flouci/Konnect) at rest
 *   - Hashing API keys (only the hash is stored)
 *   - Generating prefixed entity IDs (`pd_store_xxx`, `pd_order_xxx`)
 */

import * as crypto from 'crypto';
import { customAlphabet } from 'nanoid';
import { config } from '../config';
import { PdInternalError } from '../errors';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = config.encryptionKey;
  if (hex.length !== 64) {
    throw new PdInternalError(
      'PD_ENCRYPTION_KEY must be 32 bytes (64 hex chars). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * AES-256-GCM encryption. Output format (base64):
 *   <iv:12><tag:16><ciphertext:N>
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * SHA-256 hash. Use for API key storage.
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Cryptographically secure random hex string.
 */
export function randomHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// =====================================================
// Prefixed ID generation
// =====================================================

const idAlphabet = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
const nano = customAlphabet(idAlphabet, 16);

/**
 * Generate a prefixed entity ID — e.g. `pd_store_aB3cD4eF5gH6iJ7k`.
 *
 * @param entity short snake_case entity name (store, order, product, ...)
 */
export function pdId(entity: string): string {
  return `pd_${entity}_${nano()}`;
}

/**
 * Generate a public API key for vendors.
 *   Returns { key, prefix, hash }
 *   - `key` is shown ONCE to the vendor (format: `pd_sk_<entropy>`)
 *   - `prefix` is the first 10 chars (stored for display)
 *   - `hash` is SHA-256 of the full key (stored for verification)
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const entropy = randomHex(24); // 48 hex chars
  const key = `pd_sk_${entropy}`;
  return {
    key,
    prefix: key.slice(0, 10), // pd_sk_aaaa
    hash: sha256(key),
  };
}
