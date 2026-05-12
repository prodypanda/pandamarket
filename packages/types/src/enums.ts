/**
 * Shared enums for PandaMarket.
 */

// =====================================================
// User & Auth
// =====================================================

export enum UserRole {
  Customer = 'customer',
  Vendor = 'vendor',
  Admin = 'admin',
  SuperAdmin = 'super_admin',
}

// =====================================================
// Store
// =====================================================

export enum StoreStatus {
  Unverified = 'unverified',
  Verified = 'verified',
  Suspended = 'suspended',
}

export enum SellerType {
  Wholesaler = 'wholesaler',
  Retailer = 'retailer',
  Hybrid = 'hybrid',
}

export enum SubscriptionPlan {
  Free = 'free',
  Starter = 'starter',
  Regular = 'regular',
  Agency = 'agency',
  Pro = 'pro',
  Golden = 'golden',
  Platinum = 'platinum',
}

export enum SubscriptionType {
  Commission = 'commission',
  Yearly = 'yearly',
}

export enum ShippingMode {
  SelfManaged = 'self_managed',
  PlatformUnified = 'platform_unified',
}

// =====================================================
// Product
// =====================================================

export enum ProductType {
  Physical = 'physical',
  Digital = 'digital',
  Serial = 'serial',
  Service = 'service',
}

export enum ProductStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
  PendingApproval = 'pending_approval',
  Rejected = 'rejected',
}

// =====================================================
// Order & Payment
// =====================================================

export enum OrderStatus {
  PaymentRequired = 'payment_required',
  Pending = 'pending',
  Processing = 'processing',
  Fulfilled = 'fulfilled',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

export enum PaymentGateway {
  Flouci = 'flouci',
  Konnect = 'konnect',
  ManualMandat = 'manual_mandat',
  Cod = 'cod',
}

export enum PaymentStatus {
  Pending = 'pending',
  Captured = 'captured',
  Failed = 'failed',
  Refunded = 'refunded',
}

// =====================================================
// KYC
// =====================================================

export enum VerificationStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

// =====================================================
// Mandat Minute
// =====================================================

export enum MandatStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum MandatUploader {
  Buyer = 'buyer',
  Vendor = 'vendor',
}

// =====================================================
// Wallet
// =====================================================

export enum PayoutMode {
  Automatic = 'automatic',
  OnDemand = 'on_demand',
}

export enum WalletTransactionType {
  Sale = 'sale',
  Commission = 'commission',
  Payout = 'payout',
  Refund = 'refund',
  AddonPurchase = 'addon_purchase',
}

// =====================================================
// Reports (Fraud signaling)
// =====================================================

export enum ReportStatus {
  Open = 'open',
  Investigating = 'investigating',
  AwaitingBuyer = 'awaiting_buyer',
  AwaitingSeller = 'awaiting_seller',
  Resolved = 'resolved',
  Dismissed = 'dismissed',
}

export enum ReportTargetType {
  Seller = 'seller',
  Buyer = 'buyer',
}

export enum ReportSource {
  Buyer = 'buyer',
  Admin = 'admin',
}

export enum ReportPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

export enum ReportMessageVisibility {
  BuyerAdmin = 'buyer_admin',
  SellerAdmin = 'seller_admin',
  AllParties = 'all_parties',
  AdminInternal = 'admin_internal',
}

export enum ReportEventType {
  CaseCreated = 'case_created',
  MessageAdded = 'message_added',
  AttachmentAdded = 'attachment_added',
  StatusChanged = 'status_changed',
  NoteUpdated = 'note_updated',
}

// =====================================================
// AI Jobs
// =====================================================

export enum AiJobType {
  ImageCompression = 'image_compression',
  SeoGeneration = 'seo_generation',
}

export enum AiJobStatus {
  Queued = 'queued',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

// =====================================================
// API Keys
// =====================================================

export enum ApiKeyScope {
  ReadProducts = 'read:products',
  WriteProducts = 'write:products',
  ReadOrders = 'read:orders',
  WriteOrders = 'write:orders',
  ReadCustomers = 'read:customers',
  FullAccess = 'full_access',
}

// =====================================================
// Reviews
// =====================================================

export enum ReviewStatus {
  Published = 'published',
  Pending = 'pending',
  Hidden = 'hidden',
  Flagged = 'flagged',
}
