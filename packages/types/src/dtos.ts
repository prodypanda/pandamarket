/**
 * Data Transfer Objects (DTOs) for API requests/responses.
 */

import {
  ApiKeyScope,
  PaymentGateway,
  PayoutMode,
  ProductType,
  ShippingMode,
  SubscriptionPlan,
} from './enums';
import { IAddress } from './entities';

// =====================================================
// Auth
// =====================================================

export interface RegisterDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  store_name?: string; // if vendor
  subdomain?: string; // if vendor
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    store_id: string | null;
  };
}

// =====================================================
// Store
// =====================================================

export interface CreateStoreDto {
  name: string;
  subdomain: string;
}

export interface UpdateStoreDto {
  name?: string;
  custom_domain?: string;
  shipping_mode?: ShippingMode;
}

export interface UpdateStoreSettingsDto {
  colors?: { primary?: string; secondary?: string; accent?: string };
  logo_url?: string;
  favicon_url?: string;
  store_name?: string;
  store_description?: string;
  social?: { facebook?: string; instagram?: string; tiktok?: string };
}

export interface UpdatePaymentConfigDto {
  flouci_app_token?: string;
  flouci_app_secret?: string;
  konnect_api_key?: string;
  konnect_receiver_wallet?: string;
}

// =====================================================
// Product
// =====================================================

export interface CreateProductDto {
  type: ProductType;
  title: string;
  description?: string;
  category?: string;
  price: number;
  inventory_quantity?: number;
  weight_grams?: number;
  tags?: string[];
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  status?: 'draft' | 'published' | 'archived';
}

// =====================================================
// Order
// =====================================================

export interface CartItemDto {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

export interface CheckoutDto {
  items: CartItemDto[];
  shipping_address: IAddress;
  payment_gateway: PaymentGateway;
}

// =====================================================
// Wallet
// =====================================================

export interface WithdrawDto {
  amount: number;
  bank_iban?: string;
  notes?: string;
}

export interface UpdatePayoutModeDto {
  payout_mode: PayoutMode;
}

// =====================================================
// KYC
// =====================================================

export interface SubmitKycDto {
  rc_document_url: string;
  cin_document_url: string;
  phone_number: string;
}

// =====================================================
// Mandat Minute
// =====================================================

export interface UploadMandatProofDto {
  order_id: string;
  image_url: string;
  amount_expected: number;
}

export interface ReviewMandatDto {
  proof_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

// =====================================================
// Reports
// =====================================================

export interface CreateReportDto {
  store_id: string;
  order_id?: string;
  reason: string;
  evidence_urls?: string[];
}

// =====================================================
// API Keys
// =====================================================

export interface CreateApiKeyDto {
  label: string;
  scopes: ApiKeyScope[];
  expires_at?: string;
}

export interface CreateApiKeyResponseDto {
  id: string;
  key: string; // shown ONLY ONCE
  prefix: string;
  label: string;
  scopes: ApiKeyScope[];
  created_at: string;
}

// =====================================================
// Subscriptions
// =====================================================

export interface UpgradeSubscriptionDto {
  plan: SubscriptionPlan;
  payment_gateway: PaymentGateway;
}

// =====================================================
// AI
// =====================================================

export interface CompressImageDto {
  image_url: string;
  product_id?: string;
}

export interface SeoGenerateDto {
  product_id: string;
  language?: 'fr' | 'ar' | 'en';
}

// =====================================================
// Pagination & generic responses
// =====================================================

export interface PaginationDto {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface SuccessResponse<T = unknown> {
  data: T;
}

// =====================================================
// Search
// =====================================================

export interface SearchQueryDto {
  q?: string;
  category?: string;
  store_id?: string;
  price_min?: number;
  price_max?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}

export interface SearchResultDto {
  id: string;
  title: string;
  price: number;
  thumbnail: string | null;
  store_id: string;
  store_name: string;
  store_verified: boolean;
  category: string | null;
}
