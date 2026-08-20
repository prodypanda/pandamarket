/**
 * Server-authoritative payment method capability discovery.
 *
 * The public contract contains only availability, safe reason codes, and a
 * deterministic version. Provider credentials remain internal and are never
 * included in the buyer response or the version payload.
 */

import type { QueryResult, QueryResultRow } from 'pg';
import {
  IAddress,
  IPaymentCapabilities,
  IPaymentMethodCapability,
  PaymentCapabilityReasonCode,
  PaymentGateway,
  ProductType,
  ShippingMode,
  StoreStatus,
} from '@pandamarket/types';
import { query } from '../db/pool';
import { config } from '../config';
import { sha256 } from '../utils/crypto';
import { decryptVendorConfig } from '../plugins/payment';
import { PdConflictError, PdErrorCode, PdValidationError } from '../errors';
import { platformConfigService, type PlatformSettings } from './platform-config.service';
import type { CheckoutQuote } from './checkout-quote.service';

type SqlExecutor = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
};

export interface PaymentCapabilityItem {
  store_id: string;
  product_type: ProductType;
}

export interface PaymentCapabilityContext {
  quote_id: string | null;
  quote_version: number | null;
  currency: string;
  items: PaymentCapabilityItem[];
  shipping_address: IAddress | null;
}

export interface PaymentGatewaySelection {
  capability_version: string;
  vendor_credentials?: Record<string, string>;
  merchant_account_id: string | null;
}

interface CapabilityOrder {
  id: string;
  payment_gateway: PaymentGateway;
  payment_capability_version?: string | null;
  quote_id?: string | null;
  quote_version?: number | null;
  currency: string;
  shipping_address: IAddress | null;
}

interface StoreCapabilityRow {
  id: string;
  status: StoreStatus;
  is_verified: boolean;
  subscription_plan: string;
  subscription_expires_at: Date | string | null;
  payment_config: string | null;
  shipping_mode: ShippingMode;
  has_direct_payment: boolean;
  plan_enabled: boolean;
}

interface GatewayDecision {
  method: IPaymentMethodCapability;
  vendor_credentials?: Record<string, string>;
  merchant_account_id: string | null;
  payment_mode: 'platform' | 'vendor_direct' | 'offline';
}

interface EvaluationResult {
  contract: IPaymentCapabilities;
  decisions: Map<PaymentGateway, GatewayDecision>;
}

const GATEWAY_ORDER = [
  PaymentGateway.Flouci,
  PaymentGateway.Konnect,
  PaymentGateway.PayPal,
  PaymentGateway.ManualMandat,
  PaymentGateway.Cod,
] as const;

const PAYPAL_SUPPORTED_CURRENCIES = new Set([
  'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF',
  'ILS', 'JPY', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'SEK', 'SGD', 'THB',
  'TWD', 'USD',
]);

const BUYER_MESSAGES: Record<PaymentCapabilityReasonCode, string> = {
  gateway_disabled: "Ce moyen de paiement n'est pas disponible actuellement.",
  provider_unavailable: "Ce moyen de paiement n'est pas disponible actuellement.",
  seller_unavailable: "Un vendeur de cette commande n'est plus disponible.",
  direct_payment_unavailable: "Ce moyen de paiement n'est pas disponible pour cette boutique.",
  direct_credentials_unavailable: "Ce moyen de paiement n'est pas configure pour cette boutique.",
  multi_store_unsupported: "Ce moyen de paiement n'est pas disponible pour une commande multi-boutiques.",
  physical_items_required: 'Le paiement a la livraison exige au moins un produit physique.',
  shipping_address_required: "Renseignez l'adresse de livraison pour afficher ce moyen de paiement.",
  destination_unsupported: "La destination de livraison n'est pas prise en charge actuellement.",
  shipping_unavailable: "La livraison n'est pas disponible pour cette commande.",
  currency_unsupported: "La devise de cette commande n'est pas prise en charge.",
  mandat_unavailable: "Le paiement par Mandat Minute n'est pas disponible actuellement.",
};

function settingBoolean(value: PlatformSettings[keyof PlatformSettings]): boolean {
  return value === true || value === 1 || value === 'true';
}

function settingString(value: PlatformSettings[keyof PlatformSettings], fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function configuredValue(value: unknown, placeholders: string[] = []): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const normalized = value.trim().toLowerCase();
  return !placeholders.some((placeholder) => normalized === placeholder.toLowerCase());
}

function gatewayCredentialsComplete(
  gateway: PaymentGateway,
  credentials: Record<string, string> | null,
): boolean {
  if (!credentials) return false;
  if (gateway === PaymentGateway.Flouci) {
    return configuredValue(credentials.flouci_app_token)
      && configuredValue(credentials.flouci_app_secret);
  }
  if (gateway === PaymentGateway.Konnect) {
    return configuredValue(credentials.konnect_api_key)
      && configuredValue(credentials.konnect_receiver_wallet);
  }
  if (gateway === PaymentGateway.PayPal) {
    return configuredValue(credentials.paypal_client_id)
      && configuredValue(credentials.paypal_client_secret);
  }
  return false;
}

function merchantAccountId(
  gateway: PaymentGateway,
  credentials?: Record<string, string>,
): string | null {
  if (!credentials) return null;
  if (gateway === PaymentGateway.Flouci) return credentials.flouci_app_token || null;
  if (gateway === PaymentGateway.Konnect) return credentials.konnect_receiver_wallet || null;
  if (gateway === PaymentGateway.PayPal) return credentials.paypal_client_id || null;
  return null;
}

function directEntitlementActive(store: StoreCapabilityRow): boolean {
  if (!store.plan_enabled || !store.has_direct_payment) return false;
  if (!store.subscription_expires_at) return true;
  const expiresAt = new Date(store.subscription_expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function availableMethod(
  gateway: PaymentGateway,
  requiresRedirect: boolean,
): IPaymentMethodCapability {
  return { gateway, available: true, requires_redirect: requiresRedirect };
}

function unavailableMethod(
  gateway: PaymentGateway,
  requiresRedirect: boolean,
  reasonCode: PaymentCapabilityReasonCode,
): IPaymentMethodCapability {
  return {
    gateway,
    available: false,
    reason_code: reasonCode,
    buyer_message: BUYER_MESSAGES[reasonCode],
    requires_redirect: requiresRedirect,
  };
}

function stableVersionPayload(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableVersionPayload).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableVersionPayload(record[key])}`)
    .join(',')}}`;
}

export class PaymentCapabilityService {
  async getForQuote(quote: CheckoutQuote): Promise<IPaymentCapabilities> {
    return this.getCapabilities({
      context: {
        quote_id: quote.id,
        quote_version: quote.quote_version,
        currency: quote.currency,
        items: quote.items.map((item) => ({
          store_id: item.store_id,
          product_type: item.product_type,
        })),
        shipping_address: quote.shipping_address,
      },
    });
  }

  async getCapabilities(opts: {
    context: PaymentCapabilityContext;
    settings?: PlatformSettings;
    executor?: SqlExecutor;
    lock_stores?: boolean;
  }): Promise<IPaymentCapabilities> {
    return (await this.evaluate(opts)).contract;
  }

  async assertOrderGatewayAvailable(
    order: CapabilityOrder,
    gateway: PaymentGateway,
  ): Promise<PaymentGatewaySelection> {
    if (order.payment_gateway !== gateway) {
      throw new PdConflictError(
        PdErrorCode.PAY_GATEWAY_UNAVAILABLE,
        'The requested payment method does not match this order',
        {
          gateway,
          order_gateway: order.payment_gateway,
          reason_code: 'provider_unavailable',
        },
      );
    }

    const { rows } = await query<PaymentCapabilityItem>(
      `SELECT oi.store_id, p.type AS product_type
       FROM pd_order_item oi
       JOIN pd_product p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [order.id],
    );
    if (!rows.length) throw new PdValidationError('Order does not contain payable items');

    return this.assertGatewayAvailable({
      context: {
        quote_id: order.quote_id ?? null,
        quote_version: order.quote_version ?? null,
        currency: order.currency,
        items: rows,
        shipping_address: order.shipping_address,
      },
      gateway,
      expected_version: order.payment_capability_version,
    });
  }

  async assertGatewayAvailable(opts: {
    context: PaymentCapabilityContext;
    gateway: PaymentGateway;
    expected_version?: string | null;
    settings?: PlatformSettings;
    executor?: SqlExecutor;
    lock_stores?: boolean;
  }): Promise<PaymentGatewaySelection> {
    const result = await this.evaluate(opts);
    const currentVersion = result.contract.capability_version;
    if (opts.expected_version && opts.expected_version !== currentVersion) {
      throw new PdConflictError(
        PdErrorCode.PAY_CAPABILITY_STALE,
        'Payment availability changed after the quote was issued',
        {
          expected_version: opts.expected_version,
          current_version: currentVersion,
          quote_id: opts.context.quote_id,
        },
      );
    }

    const decision = result.decisions.get(opts.gateway);
    if (!decision?.method.available) {
      throw new PdConflictError(
        PdErrorCode.PAY_GATEWAY_UNAVAILABLE,
        decision?.method.buyer_message || "Ce moyen de paiement n'est pas disponible.",
        {
          gateway: opts.gateway,
          reason_code: decision?.method.reason_code || 'provider_unavailable',
          capability_version: currentVersion,
          quote_id: opts.context.quote_id,
        },
      );
    }

    return {
      capability_version: currentVersion,
      vendor_credentials: decision.vendor_credentials,
      merchant_account_id: decision.merchant_account_id,
    };
  }

  private async evaluate(opts: {
    context: PaymentCapabilityContext;
    settings?: PlatformSettings;
    executor?: SqlExecutor;
    lock_stores?: boolean;
  }): Promise<EvaluationResult> {
    const context = opts.context;
    if (!context.items.length) throw new PdValidationError('Cart is empty');

    const storeIds = Array.from(new Set(context.items.map((item) => item.store_id))).sort();
    if (!storeIds.length) throw new PdValidationError('Cart does not contain a store');

    const settings = opts.settings || await platformConfigService.getSettingsFresh();
    const stores = await this.loadStores(storeIds, opts.executor, opts.lock_stores === true);
    const storesById = new Map(stores.map((store) => [store.id, store]));
    const allStoresPresent = storeIds.every((storeId) => storesById.has(storeId));
    const storesPublic = allStoresPresent && stores.every(
      (store) => store.status === StoreStatus.Verified && store.is_verified === true,
    );
    const physicalItems = context.items.some((item) => item.product_type === ProductType.Physical);
    const physicalStoreIds = new Set(
      context.items
        .filter((item) => item.product_type === ProductType.Physical)
        .map((item) => item.store_id),
    );
    const destinationCountry = context.shipping_address?.country?.trim().toUpperCase() || null;
    const shippingAddressMissing = physicalItems && !context.shipping_address;
    const destinationUnsupported = physicalItems && destinationCountry !== 'TN';
    const shippingGloballyEnabled = settingBoolean(settings.shipping_enabled);
    const shippingModesReady = stores
      .filter((store) => physicalStoreIds.has(store.id))
      .every((store) => {
        if (store.shipping_mode === ShippingMode.SelfManaged) {
          return settingBoolean(settings.shipping_self_managed_enabled);
        }
        if (store.shipping_mode === ShippingMode.PlatformUnified) {
          return settingBoolean(settings.shipping_platform_unified_enabled);
        }
        return false;
      });
    const shippingUnavailable = physicalItems
      && (!shippingGloballyEnabled || !shippingModesReady);

    const credentialSource = settingString(
      settings.payment_platform_credentials_source,
      'environment',
    );
    const vendorDirectOnly = credentialSource === 'vendor_direct_only';
    const vendorDirectEnabled = settingBoolean(settings.payment_vendor_direct_enabled);
    const singleStore = stores.length === 1 && storeIds.length === 1;
    const directStore = singleStore ? stores[0] : undefined;
    const directEntitled = Boolean(directStore && directEntitlementActive(directStore));
    const decryptedByStore = new Map<string, Record<string, string> | null>();
    for (const store of stores) {
      decryptedByStore.set(store.id, decryptVendorConfig(store.payment_config));
    }
    const directCredentials = directStore ? decryptedByStore.get(directStore.id) || null : null;

    const flouciPlatformReady = configuredValue(config.flouci.appToken, ['sandbox_token'])
      && configuredValue(config.flouci.appSecret, ['sandbox_secret']);
    const konnectPlatformReady = configuredValue(config.konnect.apiKey, ['sandbox_key'])
      && configuredValue(config.konnect.receiverWallet, ['sandbox_wallet']);
    const paypalMode = settingString(settings.payment_paypal_mode, config.paypal.mode) === 'live'
      ? 'live'
      : 'sandbox';
    const paypalClientId = paypalMode === 'live'
      ? settingString(settings.payment_paypal_live_client_id, config.paypal.clientId)
      : settingString(settings.payment_paypal_sandbox_client_id, config.paypal.clientId);
    const paypalClientSecret = paypalMode === 'live'
      ? settingString(settings.payment_paypal_live_client_secret, config.paypal.clientSecret)
      : settingString(settings.payment_paypal_sandbox_client_secret, config.paypal.clientSecret);
    const paypalPlatformReady = configuredValue(paypalClientId)
      && configuredValue(paypalClientSecret);
    const paypalTargetCurrency = settingString(settings.payment_paypal_currency, 'EUR').toUpperCase();
    const paypalFxRate = Number(settings.payment_paypal_fx_rate_tnd_to_target);
    const paypalCurrencyReady = context.currency.toUpperCase() === 'TND'
      ? PAYPAL_SUPPORTED_CURRENCIES.has(paypalTargetCurrency)
        && Number.isFinite(paypalFxRate)
        && paypalFxRate > 0
      : PAYPAL_SUPPORTED_CURRENCIES.has(context.currency.toUpperCase());
    const mandatReady = configuredValue(settings.mandat_recipient_name)
      && configuredValue(settings.mandat_recipient_cin)
      && configuredValue(settings.mandat_recipient_city);

    const directCredentialReadiness = {
      [PaymentGateway.Flouci]: gatewayCredentialsComplete(PaymentGateway.Flouci, directCredentials),
      [PaymentGateway.Konnect]: gatewayCredentialsComplete(PaymentGateway.Konnect, directCredentials),
      [PaymentGateway.PayPal]: gatewayCredentialsComplete(PaymentGateway.PayPal, directCredentials),
    };

    const commonBlocker = (): PaymentCapabilityReasonCode | null => {
      if (!storesPublic) return 'seller_unavailable';
      if (shippingAddressMissing) return 'shipping_address_required';
      if (destinationUnsupported) return 'destination_unsupported';
      if (shippingUnavailable) return 'shipping_unavailable';
      return null;
    };

    const externalDecision = (
      gateway: PaymentGateway.Flouci | PaymentGateway.Konnect | PaymentGateway.PayPal,
      enabled: boolean,
      platformReady: boolean,
      currencyReady: boolean,
    ): GatewayDecision => {
      const blocker = commonBlocker();
      if (blocker) {
        return {
          method: unavailableMethod(gateway, true, blocker),
          merchant_account_id: null,
          payment_mode: 'platform',
        };
      }
      if (!enabled) {
        return {
          method: unavailableMethod(gateway, true, 'gateway_disabled'),
          merchant_account_id: null,
          payment_mode: 'platform',
        };
      }
      if (!currencyReady) {
        return {
          method: unavailableMethod(gateway, true, 'currency_unsupported'),
          merchant_account_id: null,
          payment_mode: 'platform',
        };
      }
      if (vendorDirectOnly) {
        if (!singleStore) {
          return {
            method: unavailableMethod(gateway, true, 'multi_store_unsupported'),
            merchant_account_id: null,
            payment_mode: 'vendor_direct',
          };
        }
        if (!vendorDirectEnabled || !directEntitled) {
          return {
            method: unavailableMethod(gateway, true, 'direct_payment_unavailable'),
            merchant_account_id: null,
            payment_mode: 'vendor_direct',
          };
        }
        if (!directCredentialReadiness[gateway] || !directCredentials) {
          return {
            method: unavailableMethod(gateway, true, 'direct_credentials_unavailable'),
            merchant_account_id: null,
            payment_mode: 'vendor_direct',
          };
        }
        return {
          method: availableMethod(gateway, true),
          vendor_credentials: directCredentials,
          merchant_account_id: merchantAccountId(gateway, directCredentials),
          payment_mode: 'vendor_direct',
        };
      }

      if (
        singleStore
        && vendorDirectEnabled
        && directEntitled
        && directCredentialReadiness[gateway]
        && directCredentials
      ) {
        return {
          method: availableMethod(gateway, true),
          vendor_credentials: directCredentials,
          merchant_account_id: merchantAccountId(gateway, directCredentials),
          payment_mode: 'vendor_direct',
        };
      }

      if (!platformReady) {
        return {
          method: unavailableMethod(gateway, true, 'provider_unavailable'),
          merchant_account_id: null,
          payment_mode: 'platform',
        };
      }
      return {
        method: availableMethod(gateway, true),
        merchant_account_id: null,
        payment_mode: 'platform',
      };
    };

    const decisions = new Map<PaymentGateway, GatewayDecision>();
    decisions.set(PaymentGateway.Flouci, externalDecision(
      PaymentGateway.Flouci,
      settingBoolean(settings.payment_flouci_enabled),
      flouciPlatformReady,
      context.currency.toUpperCase() === 'TND',
    ));
    decisions.set(PaymentGateway.Konnect, externalDecision(
      PaymentGateway.Konnect,
      settingBoolean(settings.payment_konnect_enabled),
      konnectPlatformReady,
      context.currency.toUpperCase() === 'TND',
    ));
    decisions.set(PaymentGateway.PayPal, externalDecision(
      PaymentGateway.PayPal,
      settingBoolean(settings.payment_paypal_enabled),
      paypalPlatformReady,
      paypalCurrencyReady,
    ));

    const offlineBlocker = commonBlocker();
    const mandatMethod = offlineBlocker
      ? unavailableMethod(PaymentGateway.ManualMandat, false, offlineBlocker)
      : !settingBoolean(settings.payment_mandat_enabled)
        ? unavailableMethod(PaymentGateway.ManualMandat, false, 'gateway_disabled')
        : context.currency.toUpperCase() !== 'TND'
          ? unavailableMethod(PaymentGateway.ManualMandat, false, 'currency_unsupported')
          : !mandatReady
            ? unavailableMethod(PaymentGateway.ManualMandat, false, 'mandat_unavailable')
            : availableMethod(PaymentGateway.ManualMandat, false);
    decisions.set(PaymentGateway.ManualMandat, {
      method: mandatMethod,
      merchant_account_id: null,
      payment_mode: 'offline',
    });

    const codMethod = offlineBlocker
      ? unavailableMethod(PaymentGateway.Cod, false, offlineBlocker)
      : !settingBoolean(settings.payment_cod_enabled)
        ? unavailableMethod(PaymentGateway.Cod, false, 'gateway_disabled')
        : !physicalItems
          ? unavailableMethod(PaymentGateway.Cod, false, 'physical_items_required')
          : context.currency.toUpperCase() !== 'TND'
            ? unavailableMethod(PaymentGateway.Cod, false, 'currency_unsupported')
            : availableMethod(PaymentGateway.Cod, false);
    decisions.set(PaymentGateway.Cod, {
      method: codMethod,
      merchant_account_id: null,
      payment_mode: 'offline',
    });

    const methods = GATEWAY_ORDER.map((gateway) => decisions.get(gateway)!.method);
    const versionPayload = {
      contract_version: 1,
      quote_id: context.quote_id,
      quote_version: context.quote_version,
      currency: context.currency.toUpperCase(),
      destination_country: destinationCountry,
      items: context.items
        .map((item) => ({ store_id: item.store_id, product_type: item.product_type }))
        .sort((left, right) => `${left.store_id}:${left.product_type}`.localeCompare(`${right.store_id}:${right.product_type}`)),
      stores: stores.map((store) => ({
        id: store.id,
        status: store.status,
        is_verified: store.is_verified,
        subscription_plan: store.subscription_plan,
        direct_entitled: directEntitlementActive(store),
        shipping_mode: store.shipping_mode,
        direct_credentials: {
          flouci: gatewayCredentialsComplete(PaymentGateway.Flouci, decryptedByStore.get(store.id) || null),
          konnect: gatewayCredentialsComplete(PaymentGateway.Konnect, decryptedByStore.get(store.id) || null),
          paypal: gatewayCredentialsComplete(PaymentGateway.PayPal, decryptedByStore.get(store.id) || null),
        },
      })),
      platform: {
        credential_source: credentialSource,
        vendor_direct_enabled: vendorDirectEnabled,
        shipping_enabled: shippingGloballyEnabled,
        shipping_self_managed_enabled: settingBoolean(settings.shipping_self_managed_enabled),
        shipping_platform_unified_enabled: settingBoolean(settings.shipping_platform_unified_enabled),
        flouci_ready: flouciPlatformReady,
        konnect_ready: konnectPlatformReady,
        paypal_ready: paypalPlatformReady,
        paypal_mode: paypalMode,
        paypal_target_currency: paypalTargetCurrency,
        paypal_fx_rate_tnd_to_target: paypalFxRate,
        paypal_currency_ready: paypalCurrencyReady,
        mandat_ready: mandatReady,
      },
      methods: GATEWAY_ORDER.map((gateway) => {
        const decision = decisions.get(gateway)!;
        return {
          gateway,
          available: decision.method.available,
          reason_code: decision.method.reason_code || null,
          payment_mode: decision.payment_mode,
        };
      }),
    };
    const capabilityVersion = `pcv1_${sha256(stableVersionPayload(versionPayload))}`;

    return {
      contract: {
        quote_id: context.quote_id || '',
        quote_version: context.quote_version || 0,
        capability_version: capabilityVersion,
        currency: context.currency.toUpperCase(),
        methods,
      },
      decisions,
    };
  }

  private async loadStores(
    storeIds: string[],
    executor?: SqlExecutor,
    lockStores = false,
  ): Promise<StoreCapabilityRow[]> {
    const sql = `SELECT s.id, s.status, s.is_verified, s.subscription_plan,
                        s.subscription_expires_at, s.payment_config, s.shipping_mode,
                        l.has_direct_payment, l.is_enabled AS plan_enabled
                 FROM pd_store s
                 JOIN pd_subscription_limits l ON l.plan_id = s.subscription_plan
                 WHERE s.id = ANY($1::text[])
                 ORDER BY s.id
                 ${lockStores ? 'FOR SHARE OF s, l' : ''}`;
    const result = executor
      ? await executor.query<StoreCapabilityRow>(sql, [storeIds])
      : await query<StoreCapabilityRow>(sql, [storeIds]);
    return result.rows;
  }
}

export const paymentCapabilityService = new PaymentCapabilityService();
