/**
 * Entity interfaces — public contracts shared between backend and frontend.
 * Backend may have richer internal models; only what's exposed lives here.
 */

import {
  AiJobStatus,
  AiJobType,
  ApiKeyScope,
  MandatStatus,
  MandatUploader,
  OrderStatus,
  PaymentGateway,
  PaymentStatus,
  PayoutMode,
  ProductStatus,
  ProductType,
  ReportEventType,
  ReportMessageVisibility,
  ReportPriority,
  ReportSource,
  ReportStatus,
  ReportTargetType,
  ReviewStatus,
  SellerType,
  ShippingMode,
  StoreStatus,
  SubscriptionType,
  UserRole,
  VerificationStatus,
  WalletTransactionType,
} from './enums';

// =====================================================
// User
// =====================================================

export interface IUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  store_id: string | null;
  email_verified: boolean;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Store
// =====================================================

export interface IStoreSettings {
  colors?: { primary?: string; secondary?: string; accent?: string };
  logo_url?: string;
  marketplace_header_image_url?: string;
  favicon_url?: string;
  store_name?: string;
  store_description?: string;
  social?: { facebook?: string; instagram?: string; tiktok?: string };
}

export interface IStorePaymentConfig {
  flouci_app_token?: string; // encrypted at rest
  flouci_app_secret?: string;
  konnect_api_key?: string;
  konnect_receiver_wallet?: string;
}

export interface IStore {
  id: string;
  name: string;
  status: StoreStatus;
  seller_type: SellerType;
  is_verified: boolean;
  subscription_plan: string;
  subscription_type: SubscriptionType;
  subdomain: string;
  custom_domain: string | null;
  theme_id: string;
  settings: IStoreSettings;
  // payment_config is NEVER returned to clients in raw form
  shipping_mode: ShippingMode;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Subscription Limits
// =====================================================

export interface ISubscriptionLimits {
  plan_id: string;
  max_products: number; // -1 = unlimited
  max_images_per_product: number;
  max_page_builder_pages: number; // -1 = unlimited
  has_ai_seo: boolean;
  has_image_compression: boolean;
  has_custom_domain: boolean;
  has_page_builder: boolean;
  has_direct_payment: boolean;
  has_white_label: boolean;
  has_own_ai_provider: boolean;
  commission_rate: number; // e.g. 0.15 for 15%
  ai_tokens_included: number;
  yearly_price: number; // TND
  is_enabled?: boolean;
}

// =====================================================
// Product
// =====================================================

export interface IProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  position: number;
  is_thumbnail: boolean;
}

export interface IProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  title: string;
  price: number;
  inventory_quantity: number;
  options: Record<string, string>; // { size: 'M', color: 'red' }
}

export interface IProduct {
  id: string;
  store_id: string;
  type: ProductType;
  status: ProductStatus;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  product_reference: string | null;
  price: number;
  inventory_quantity: number;
  weight_grams: number | null;
  thumbnail: string | null;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[];
  attributes: Array<{ name: string; value: string }>;
  images: IProductImage[];
  variants: IProductVariant[];
  created_at: string;
  updated_at: string;
}

// =====================================================
// Order
// =====================================================

export interface IOrderItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  store_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface IOrder {
  id: string;
  customer_id: string;
  status: OrderStatus;
  payment_gateway: PaymentGateway;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping_total: number;
  total: number;
  currency: string; // 'TND'
  shipping_address: IAddress | null;
  items: IOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface IAddress {
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postal_code: string;
  country: string; // 'TN'
}

// =====================================================
// Payments
// =====================================================

export interface IMandatProof {
  id: string;
  order_id: string;
  uploaded_by: MandatUploader;
  image_url: string;
  amount_expected: number;
  status: MandatStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

// =====================================================
// Wallet
// =====================================================

export interface IVendorWallet {
  id: string;
  store_id: string;
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  payout_mode: PayoutMode;
  retention_days: number;
  currency: string;
}

export interface IWalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  order_id: string | null;
  description: string | null;
  created_at: string;
}

// =====================================================
// Vendor Credits (AI tokens)
// =====================================================

export interface IVendorCredits {
  id: string;
  store_id: string;
  ai_tokens: number;
  tokens_used: number;
  last_refill: string | null;
}

// =====================================================
// KYC
// =====================================================

export interface IVerificationDocuments {
  id: string;
  store_id: string;
  rc_document_url: string | null;
  cin_document_url: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  status: VerificationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

// =====================================================
// Reports
// =====================================================

export interface IReport {
  id: string;
  reporter_id: string;
  reporter_email?: string | null;
  reporter_role?: UserRole | string | null;
  source: ReportSource;
  target_type: ReportTargetType;
  target_user_id: string | null;
  target_user_email?: string | null;
  target_user_role?: UserRole | string | null;
  target_user_is_active?: boolean | null;
  store_id: string | null;
  store_name?: string | null;
  store_subdomain?: string | null;
  store_status?: string | null;
  order_id: string | null;
  category: string;
  priority: ReportPriority;
  reason: string;
  evidence_urls: string[];
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolver_email?: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface IReportMessage {
  id: string;
  report_id: string;
  author_id: string | null;
  author_email?: string | null;
  author_role: UserRole | string;
  visibility: ReportMessageVisibility;
  body: string;
  created_at: string;
  updated_at?: string | null;
}

export interface IReportAttachment {
  id: string;
  report_id: string;
  message_id: string | null;
  uploaded_by: string | null;
  uploader_email?: string | null;
  visibility: ReportMessageVisibility;
  file_url: string | null;
  file_key: string | null;
  file_name: string;
  content_type: string;
  file_size: number | string | null;
  created_at: string;
}

export interface IReportEvent {
  id: string;
  report_id: string;
  actor_id: string | null;
  actor_email?: string | null;
  event_type: ReportEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IReportCase {
  report: IReport;
  messages: IReportMessage[];
  attachments: IReportAttachment[];
  events: IReportEvent[];
}

// =====================================================
// API Keys
// =====================================================

// ApiKeyScope is now imported from enums.ts above and re-exported via index.ts

export interface IApiKey {
  id: string;
  store_id: string;
  key_prefix: string;
  label: string;
  scopes: ApiKeyScope[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// =====================================================
// AI Jobs
// =====================================================

export interface IAiJob {
  id: string;
  store_id: string;
  type: AiJobType;
  status: AiJobStatus;
  input_url: string | null;
  output: Record<string, unknown> | null;
  tokens_consumed: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// =====================================================
// Theme
// =====================================================

export interface ITheme {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  is_free: boolean;
  price: number;
  is_active: boolean;
}

// =====================================================
// Notifications
// =====================================================

export interface INotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// =====================================================
// Reviews
// =====================================================

export interface IReview {
  id: string;
  product_id: string;
  customer_id: string;
  store_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  status: ReviewStatus;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  /** Joined fields (optional, populated on read) */
  customer_name?: string;
}

export interface IProductRating {
  product_id: string;
  average_rating: number;
  review_count: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
}

// =====================================================
// Wishlist
// =====================================================

export interface IWishlistItem {
  id: string;
  customer_id: string;
  product_id: string;
  created_at: string;
  /** Joined fields (optional, populated on read) */
  product_title?: string;
  product_price?: number;
  product_thumbnail?: string | null;
  product_status?: string;
  store_name?: string;
}
