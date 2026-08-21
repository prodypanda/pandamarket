import { fetchWithCsrf } from './api';

export type CheckoutScope = 'hub' | 'storefront';

export interface CheckoutAddressForm {
  full_name: string;
  address_line: string;
  city: string;
  postal_code: string;
  phone: string;
}

export type CheckoutAddressField = keyof CheckoutAddressForm;
export type CheckoutAddressFieldError = 'required' | 'invalid';
export type CheckoutAddressErrors = Partial<Record<CheckoutAddressField, CheckoutAddressFieldError>>;

export interface CheckoutAddress {
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface CheckoutItemInput {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

export interface CheckoutQuoteLine {
  product_id: string;
  variant_id: string | null;
  store_id: string;
  title: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  product_type: string;
  discount_amount?: number;
  discount_breakdown?: Record<string, unknown>;
}

export interface CheckoutQuoteBreakdown {
  coupon?: {
    code?: string;
    type?: string | null;
    scope?: string | null;
    product_discount?: number;
    shipping_discount?: number;
  } | null;
  shipping?: {
    gross?: number;
    combined_store_rebate?: number;
    free_shipping_discount?: number;
    coupon_discount?: number;
    total?: number;
    by_store?: Record<string, number>;
  };
  tax?: {
    mode?: string;
    rate?: number;
    total?: number;
  };
  items?: Array<Record<string, unknown>>;
}

export interface CheckoutPaymentMethodCapability {
  gateway: string;
  available: boolean;
  reason_code?: string;
  buyer_message?: string;
  requires_redirect: boolean;
}

export interface CheckoutPaymentCapabilities {
  quote_id: string;
  quote_version: number;
  capability_version: string;
  currency: string;
  methods: CheckoutPaymentMethodCapability[];
}

export interface CheckoutQuote {
  id: string;
  quote_version: number;
  store_id: string | null;
  items: CheckoutQuoteLine[];
  shipping_address: CheckoutAddress | null;
  coupon_code: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  breakdown: CheckoutQuoteBreakdown;
  payment_capabilities: CheckoutPaymentCapabilities;
  expires_at: string;
  consumed_at: string | null;
  consumed_order_id: string | null;
}

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export const RECOVERABLE_QUOTE_ERROR_CODES = new Set([
  'PD_ORDER_QUOTE_NOT_FOUND',
  'PD_ORDER_QUOTE_EXPIRED',
  'PD_ORDER_QUOTE_STALE',
  'PD_PAY_CAPABILITY_STALE',
  'PD_PAY_GATEWAY_UNAVAILABLE',
]);

export class CheckoutRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, options: { status: number; code?: string; details?: Record<string, unknown> }) {
    super(message);
    this.name = 'CheckoutRequestError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function requestError(response: Response, payload: unknown, fallback: string): CheckoutRequestError {
  const apiError = (payload || {}) as ApiErrorPayload;
  return new CheckoutRequestError(apiError.error?.message || fallback, {
    status: response.status,
    code: apiError.error?.code,
    details: apiError.error?.details,
  });
}

function isQuotePayload(value: unknown): value is CheckoutQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as Partial<CheckoutQuote>;
  const paymentCapabilities = quote.payment_capabilities;
  const paymentMethods = paymentCapabilities?.methods;
  return Boolean(
    quote.id &&
    Number.isInteger(quote.quote_version) &&
    Array.isArray(quote.items) &&
    typeof quote.currency === 'string' &&
    typeof quote.subtotal === 'number' &&
    typeof quote.discount_total === 'number' &&
    typeof quote.shipping_total === 'number' &&
    typeof quote.tax_total === 'number' &&
    typeof quote.total === 'number' &&
    Boolean(quote.breakdown && typeof quote.breakdown === 'object') &&
    paymentCapabilities
    && paymentCapabilities.quote_id === quote.id
    && paymentCapabilities.quote_version === quote.quote_version
    && paymentCapabilities.currency === quote.currency
    && /^pcv1_[a-f0-9]{64}$/.test(paymentCapabilities.capability_version)
    && Array.isArray(paymentMethods)
    && paymentMethods.length > 0
    && paymentMethods.every((method) => Boolean(
      method
      && typeof method.gateway === 'string'
      && typeof method.available === 'boolean'
      && typeof method.requires_redirect === 'boolean',
    )) &&
    typeof quote.expires_at === 'string',
  );
}

export function normalizeCheckoutAddress(address: CheckoutAddressForm): CheckoutAddress {
  const names = address.full_name.trim().split(/\s+/).filter(Boolean);
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || firstName;

  return {
    first_name: firstName,
    last_name: lastName,
    phone: address.phone.trim(),
    address_line_1: address.address_line.trim(),
    city: address.city.trim(),
    postal_code: address.postal_code.trim(),
    country: 'TN',
  };
}

export function isCheckoutAddressComplete(address: CheckoutAddressForm): boolean {
  return Object.keys(validateCheckoutAddress(address)).length === 0;
}

/**
 * Keep client feedback aligned with the server's required checkout fields.
 * The returned codes are translated by each checkout surface so Hub and
 * tenant storefronts can preserve their local language without duplicating
 * the validation rules.
 */
export function validateCheckoutAddress(address: CheckoutAddressForm): CheckoutAddressErrors {
  const normalized = normalizeCheckoutAddress(address);
  const errors: CheckoutAddressErrors = {};

  if (!normalized.first_name) errors.full_name = 'required';
  if (!normalized.address_line_1) errors.address_line = 'required';
  if (!normalized.city) errors.city = 'required';
  if (!normalized.postal_code) errors.postal_code = 'required';
  if (normalized.phone.length < 6) errors.phone = normalized.phone ? 'invalid' : 'required';

  return errors;
}

export function firstCheckoutAddressError(errors: CheckoutAddressErrors): CheckoutAddressField | null {
  const fields: CheckoutAddressField[] = ['full_name', 'address_line', 'city', 'postal_code', 'phone'];
  return fields.find((field) => Boolean(errors[field])) || null;
}

export function toCheckoutItems(
  items: Array<{ product_id: string; variant_id?: string | null; quantity: number }>,
): CheckoutItemInput[] {
  return items.map((item) => ({
    product_id: item.product_id,
    ...(item.variant_id ? { variant_id: item.variant_id } : {}),
    quantity: item.quantity,
  }));
}

export function createCheckoutIdempotencyKey(scope: CheckoutScope): string {
  const randomPart = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `checkout_${scope}_${randomPart}`.slice(0, 128);
}

export function isRecoverableQuoteError(error: unknown): error is CheckoutRequestError {
  return error instanceof CheckoutRequestError
    && Boolean(error.code && RECOVERABLE_QUOTE_ERROR_CODES.has(error.code));
}

export function checkoutQuoteTotalsMatch(left: CheckoutQuote | null, right: CheckoutQuote): boolean {
  if (!left) return false;
  return left.currency === right.currency
    && left.coupon_code === right.coupon_code
    && left.payment_capabilities.capability_version
      === right.payment_capabilities.capability_version
    && Math.abs(left.subtotal - right.subtotal) <= 0.001
    && Math.abs(left.discount_total - right.discount_total) <= 0.001
    && Math.abs(left.shipping_total - right.shipping_total) <= 0.001
    && Math.abs(left.tax_total - right.tax_total) <= 0.001
    && Math.abs(left.total - right.total) <= 0.001;
}

export function getQuoteProductDiscount(quote: CheckoutQuote): number {
  const value = Number(quote.breakdown.coupon?.product_discount || 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getQuoteShippingSavings(quote: CheckoutQuote): number {
  const shipping = quote.breakdown.shipping;
  if (!shipping) return 0;
  const explicitSavings = Number(shipping.combined_store_rebate || 0)
    + Number(shipping.free_shipping_discount || 0)
    + Number(shipping.coupon_discount || 0);
  if (Number.isFinite(explicitSavings) && explicitSavings > 0) return explicitSavings;
  const gross = Number(shipping.gross || 0);
  return Number.isFinite(gross) ? Math.max(0, gross - quote.shipping_total) : 0;
}

export function formatCheckoutMoney(amount: number, currency: string): string {
  return `${amount.toFixed(3)} ${currency}`;
}

export async function requestCheckoutQuote(input: {
  scope: CheckoutScope;
  items: CheckoutItemInput[];
  shippingAddress: CheckoutAddress | null;
  couponCode?: string | null;
  signal?: AbortSignal;
}): Promise<CheckoutQuote> {
  const endpoint = input.scope === 'hub'
    ? '/api/pd/cart/quote'
    : '/api/pd/cart/storefront/quote';
  const response = await fetchWithCsrf(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal: input.signal,
    body: JSON.stringify({
      items: input.items,
      shipping_address: input.shippingAddress,
      ...(input.couponCode ? { coupon_code: input.couponCode } : {}),
    }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw requestError(response, payload, 'Unable to calculate the order total');

  const quote = (payload as { data?: unknown } | null)?.data;
  if (!isQuotePayload(quote)) {
    throw new CheckoutRequestError('The checkout quote response was incomplete', { status: response.status });
  }
  return quote;
}

export async function submitCheckoutOrder(input: {
  scope: CheckoutScope;
  idempotencyKey: string;
  quoteId: string;
  items: CheckoutItemInput[];
  shippingAddress: CheckoutAddress | null;
  paymentGateway: string;
  paymentCapabilityVersion: string;
  couponCode?: string | null;
  adsAttribution?: { campaign_id: string; creative_id: string; event_key: string };
}): Promise<{ orderId: string; order: Record<string, unknown> }> {
  const endpoint = input.scope === 'hub'
    ? '/api/pd/orders/checkout'
    : '/api/pd/orders/storefront/checkout';
  const response = await fetchWithCsrf(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    credentials: 'include',
    body: JSON.stringify({
      quote_id: input.quoteId,
      items: input.items,
      shipping_address: input.shippingAddress,
      payment_gateway: input.paymentGateway,
      payment_capability_version: input.paymentCapabilityVersion,
      ...(input.couponCode ? { coupon_code: input.couponCode } : {}),
      ...(input.adsAttribution ? { ads_attribution: input.adsAttribution } : {}),
    }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw requestError(response, payload, 'Unable to create the order');

  const envelope = (payload || {}) as { order?: Record<string, unknown>; order_id?: string };
  const orderId = typeof envelope.order?.id === 'string' ? envelope.order.id : envelope.order_id;
  if (!orderId) {
    throw new CheckoutRequestError('The order response did not include an order ID', { status: response.status });
  }
  return { orderId, order: envelope.order || { id: orderId } };
}
