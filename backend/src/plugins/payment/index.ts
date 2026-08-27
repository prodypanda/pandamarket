/**
 * Payment provider registry — pick the right provider for a given gateway,
 * with optional vendor-side credential decryption (Pro+ direct payment mode).
 */

import { PaymentGateway } from '@pandamarket/types';
import { PaymentProvider } from './payment-provider.interface';
import { flouciProvider } from './flouci.provider';
import { konnectProvider } from './konnect.provider';
import { manualMandatProvider } from './manual-mandat.provider';
import { codProvider } from './cod.provider';
import { paypalProvider } from './paypal.provider';
import { decrypt } from '../../utils/crypto';
import { PdValidationError, PdErrorCode } from '../../errors';

const providers: Record<PaymentGateway, PaymentProvider> = {
  [PaymentGateway.Flouci]: flouciProvider,
  [PaymentGateway.Konnect]: konnectProvider,
  [PaymentGateway.ManualMandat]: manualMandatProvider,
  [PaymentGateway.Cod]: codProvider,
  [PaymentGateway.PayPal]: paypalProvider,
};

export function getPaymentProvider(gateway: PaymentGateway): PaymentProvider {
  const p = providers[gateway];
  if (!p) {
    throw new PdValidationError('Invalid payment gateway', {
      code: PdErrorCode.PAY_INVALID_GATEWAY,
      gateway,
    });
  }
  return p;
}

/**
 * Decrypt vendor payment_config (stored as AES-256-GCM base64).
 * Returns null when the store is in escrow mode (no config).
 */
export function decryptVendorConfig(encrypted: string | null): Record<string, string> | null {
  if (!encrypted) return null;
  try {
    return JSON.parse(decrypt(encrypted)) as Record<string, string>;
  } catch {
    return null;
  }
}

import { d17PaymentProvider } from './d17.provider';
import { sobflousPaymentProvider } from './sobflous.provider';

export {
  flouciProvider,
  konnectProvider,
  manualMandatProvider,
  codProvider,
  paypalProvider,
  d17PaymentProvider,
  sobflousPaymentProvider,
};
