/**
 * Zod schemas for request validation.
 * Use with the `validate(schema)` middleware.
 */

import { z } from 'zod';
import {
  PaymentGateway,
  PayoutMode,
  ProductType,
  ShippingMode,
} from '@pandamarket/types';
import { normalizePlanId } from '../utils/plan-id';

// =====================================================
// Auth
// =====================================================

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  phone: z.string().max(30).optional(),
  store_name: z.string().min(2).max(150).optional(),
  subdomain: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/)
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1).optional(), // may also come from cookie
});

// =====================================================
// Store
// =====================================================

export const createStoreSchema = z.object({
  name: z.string().min(2).max(150),
  subdomain: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/),
  plan: z.string().optional().transform((value) => (value ? normalizePlanId(value) : undefined)),
});

export const updateStoreSettingsSchema = z.object({
  colors: z
    .object({
      primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
    .optional(),
  logo_url: z.string().url().optional(),
  logo_light_url: z.string().url().optional(),
  logo_dark_url: z.string().url().optional(),
  favicon_url: z.string().url().optional(),
  store_name: z.string().max(150).optional(),
  store_description: z.string().max(1000).optional(),
  social: z
    .object({
      facebook: z.string().url().optional(),
      instagram: z.string().url().optional(),
      tiktok: z.string().url().optional(),
    })
    .optional(),
});

export const updateThemeSchema = z.object({
  theme_id: z.string().min(1).max(50),
});

export const updateCustomDomainSchema = z.object({
  custom_domain: z.string().min(3).max(255).nullable(),
});

export const updateShippingModeSchema = z.object({
  shipping_mode: z.nativeEnum(ShippingMode),
});

export const updatePaymentConfigSchema = z.object({
  flouci_app_token: z.string().min(1).optional(),
  flouci_app_secret: z.string().min(1).optional(),
  konnect_api_key: z.string().min(1).optional(),
  konnect_receiver_wallet: z.string().min(1).optional(),
});

// =====================================================
// Product
// =====================================================

export const createProductSchema = z.object({
  type: z.nativeEnum(ProductType).default(ProductType.Physical),
  title: z.string().min(2).max(200),
  description: z.string().max(20000).optional(),
  category: z.string().max(100).optional(),
  price: z.number().min(0),
  inventory_quantity: z.number().int().min(0).optional(),
  weight_grams: z.number().int().min(0).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export const addProductImageSchema = z.object({
  url: z.string().url(),
  alt_text: z.string().max(200).optional(),
  is_thumbnail: z.boolean().optional(),
});

// =====================================================
// Order
// =====================================================

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        variant_id: z.string().optional(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1),
  shipping_address: z.object({
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    phone: z.string().min(6).max(30),
    address_line_1: z.string().min(1).max(200),
    address_line_2: z.string().max(200).optional(),
    city: z.string().min(1).max(100),
    postal_code: z.string().min(1).max(20),
    country: z.string().length(2).default('TN'),
  }),
  payment_gateway: z.nativeEnum(PaymentGateway),
});

export const fulfillOrderSchema = z.object({
  carrier: z.string().max(50).optional(),
  tracking_number: z.string().max(100).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

// =====================================================
// Payments — Mandat Minute
// =====================================================

export const uploadMandatSchema = z.object({
  order_id: z.string().min(1),
  image_url: z.string().url(),
  amount_expected: z.number().min(0),
});

export const reviewMandatSchema = z.object({
  rejection_reason: z.string().max(500).optional(),
});

// =====================================================
// Wallet
// =====================================================

export const withdrawSchema = z.object({
  amount: z.number().min(1),
  bank_iban: z.string().max(34).optional(),
  notes: z.string().max(500).optional(),
});

export const updatePayoutModeSchema = z.object({
  payout_mode: z.nativeEnum(PayoutMode),
});

// =====================================================
// KYC
// =====================================================

export const submitKycSchema = z.object({
  rc_document_url: z.string().url(),
  cin_document_url: z.string().url(),
  phone_number: z.string().min(6).max(30),
});

export const reviewKycSchema = z.object({
  notes: z.string().max(1000).optional(),
  rejection_reason: z.string().max(500).optional(),
});

// =====================================================
// Subscriptions
// =====================================================

export const upgradePlanSchema = z.object({
  plan: z.string().transform((value) => normalizePlanId(value)),
  payment_gateway: z.nativeEnum(PaymentGateway).optional(),
});

// =====================================================
// AI
// =====================================================

export const aiCompressSchema = z.object({
  image_url: z.string().url(),
  product_id: z.string().optional(),
});

export const aiSeoSchema = z.object({
  product_id: z.string().min(1),
  language: z.enum(['fr', 'ar', 'en']).optional(),
});

// =====================================================
// Reports
// =====================================================

export const createReportSchema = z.object({
  store_id: z.string().min(1),
  order_id: z.string().optional(),
  category: z.string().max(40).optional(),
  reason: z.string().min(10).max(2000),
  evidence_urls: z.array(z.string().url()).max(10).optional(),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(['open', 'investigating', 'awaiting_buyer', 'awaiting_seller', 'resolved', 'dismissed']),
  admin_notes: z.string().max(2000).optional(),
});

export const reportAttachmentInputSchema = z.object({
  file_url: z.string().url().optional(),
  file_key: z.string().min(1).max(1024).optional(),
  file_name: z.string().min(1).max(255),
  content_type: z.string().min(1).max(120),
  file_size: z.number().int().min(0).max(20 * 1024 * 1024).optional(),
}).refine((value) => value.file_url || value.file_key, {
  message: 'Either file_url or file_key is required',
});

export const createReportMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  attachments: z.array(reportAttachmentInputSchema).max(10).optional(),
});

export const createAdminReportMessageSchema = createReportMessageSchema.extend({
  visibility: z.enum(['buyer_admin', 'seller_admin', 'all_parties', 'admin_internal']),
});

// =====================================================
// API Keys
// =====================================================

const scopeEnum = z.enum([
  'products:read',
  'products:write',
  'orders:read',
  'orders:write',
  'stock:read',
  'stock:write',
]);

export const createApiKeySchema = z.object({
  label: z.string().min(1).max(100),
  scopes: z.array(scopeEnum).min(1).max(10),
  expires_at: z.string().datetime().optional(),
});

// =====================================================
// Pagination
// =====================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =====================================================
// Search
// =====================================================

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  store_id: z.string().optional(),
  price_min: z.coerce.number().min(0).optional(),
  price_max: z.coerce.number().min(0).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =====================================================
// Upload
// =====================================================

export const presignUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z
    .string()
    .regex(/^[a-z]+\/[a-z0-9.+-]+$/i)
    .max(100),
  purpose: z.enum(['product_image', 'digital_product', 'kyc_document', 'mandat_proof', 'theme_asset', 'marketplace_asset', 'report_evidence', 'chat_image', 'delivery_proof']),
  folder: z.enum(['categories', 'branding', 'banners', 'general']).optional(),
  file_size: z.number().int().min(0).optional(),
});
