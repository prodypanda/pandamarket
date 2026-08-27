import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../utils/crypto';

describe('PLAN-T3-06: Cryptographic Authentication Data (AAD) Binding & Session Hardening', () => {
  it('encrypts and decrypts sensitive payload bound to a tenant AAD (store_id)', () => {
    const rawSecret = 'flouci_app_secret_123456789';
    const storeId = 'store_artisan_medina_99';

    const ciphertext = encrypt(rawSecret, storeId);
    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toBe(rawSecret);

    const decrypted = decrypt(ciphertext, storeId);
    expect(decrypted).toBe(rawSecret);
  });

  it('rejects cross-record ciphertext transposition when AAD does not match', () => {
    const rawSecret = 'konnect_api_key_secret_xyz';
    const storeOwnerA = 'store_artisan_A';
    const attackerStoreB = 'store_attacker_B';

    const ciphertext = encrypt(rawSecret, storeOwnerA);

    // Attempting to decrypt with a different store ID must fail GCM auth tag check
    expect(() => decrypt(ciphertext, attackerStoreB)).toThrow();
  });

  it('maintains backwards compatibility for un-scoped ciphertext without AAD', () => {
    const raw = 'general_platform_token';
    const ciphertext = encrypt(raw);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(raw);
  });
});
