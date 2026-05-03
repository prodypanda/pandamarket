/**
 * Shared test data and constants for E2E tests.
 * Matches the seed data from backend/data/seed.ts.
 */

export const TEST_USERS = {
  admin: {
    email: 'admin@pandamarket.tn',
    password: 'Admin123!',
    role: 'super_admin',
  },
  vendorPro: {
    email: 'vendor.pro@test.tn',
    password: 'Test123!',
    role: 'vendor',
    storeName: 'Pro Vendor Store',
  },
  vendorFree: {
    email: 'vendor.free@test.tn',
    password: 'Test123!',
    role: 'vendor',
    storeName: 'Free Vendor Store',
  },
  customer: {
    email: 'customer@test.tn',
    password: 'Test123!',
    role: 'customer',
  },
} as const;

export const API_BASE = process.env.E2E_API_URL || 'http://localhost:9000';

export const ROUTES = {
  hub: {
    home: '/hub',
    search: '/hub/search',
    cart: '/hub/cart',
    checkout: '/hub/checkout',
    orders: '/hub/orders',
    profile: '/hub/profile',
    pricing: '/hub/pricing',
    vendorSignup: '/hub/vendor-signup',
  },
  auth: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
  },
  dashboard: {
    home: '/hub/dashboard',
    products: '/hub/dashboard/products',
    orders: '/hub/dashboard/orders',
    wallet: '/hub/dashboard/wallet',
    kyc: '/hub/dashboard/kyc',
    settings: '/hub/dashboard/settings',
    ai: '/hub/dashboard/ai',
    subscription: '/hub/dashboard/subscription',
    apiKeys: '/hub/dashboard/api-keys',
    paymentConfig: '/hub/dashboard/payment-config',
    notifications: '/hub/dashboard/notifications',
    webhooks: '/hub/dashboard/webhooks',
    reports: '/hub/dashboard/reports',
  },
} as const;
