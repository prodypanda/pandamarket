/**
 * Swagger/OpenAPI 3.0 configuration for PandaMarket API.
 *
 * Serves interactive API documentation at /api/docs.
 * Uses swagger-jsdoc to generate the spec from JSDoc annotations
 * and a base definition defined here.
 */
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'PandaMarket API',
      version: '1.0.0',
      description:
        'PandaMarket — Marketplace as a Service (MaaS) platform API. ' +
        'Combines a central Hub marketplace with individual vendor storefronts. ' +
        'Supports Flouci, Konnect, Mandat Minute, and COD payment gateways.',
      contact: {
        name: 'PandaMarket Team',
        url: 'https://pandamarket.tn',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: '/api/pd',
        description: 'PandaMarket API (relative)',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token (15-min expiry). Obtain via POST /auth/login.',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-PD-API-Key',
          description: 'Vendor API key for ERP/POS integrations (Agency+ plans).',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'PD_VALIDATION_ERROR' },
                message: { type: 'string', example: 'Données invalides' },
                details: { type: 'object' },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & registration' },
      { name: 'Stores', description: 'Vendor store management' },
      { name: 'Products', description: 'Product catalog CRUD' },
      { name: 'Orders', description: 'Order management & checkout' },
      { name: 'Payments', description: 'Payment initiation & webhooks' },
      { name: 'Wallet', description: 'Vendor wallet & payouts' },
      { name: 'Subscriptions', description: 'Subscription plans & upgrades' },
      { name: 'Verification', description: 'KYC document submission & phone OTP' },
      { name: 'AI', description: 'AI image compression & SEO generation' },
      { name: 'Credits', description: 'AI token balance & purchases' },
      { name: 'Reports', description: 'Fraud reports & signalements' },
      { name: 'Search', description: 'Meilisearch-powered product search' },
      { name: 'Notifications', description: 'In-app notifications' },
      { name: 'Vendor API', description: 'External API for ERP/POS (API key auth)' },
      { name: 'Admin', description: 'Super admin operations' },
      { name: 'Files', description: 'Presigned URL generation for uploads' },
      { name: 'Categories', description: 'Product categories' },
      { name: 'Shipping', description: 'Shipping rates & shipment management' },
      { name: 'Themes', description: 'Storefront theme gallery & purchases' },
      { name: 'Page Builder', description: 'GrapesJS page builder for vendors' },
    ],
    paths: {
      // ── Auth ──────────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new vendor account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name', 'store_name', 'subdomain'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string' },
                    store_name: { type: 'string' },
                    subdomain: { type: 'string' },
                    plan: { type: 'string', enum: ['free', 'starter', 'regular', 'agency', 'pro', 'golden', 'platinum'] },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Account created successfully' },
            '409': { description: 'Email or subdomain already taken' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive JWT tokens',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful, returns access_token and refresh_token' },
            '401': { description: 'Invalid credentials' },
            '429': { description: 'Account locked after 5 failed attempts' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token using refresh token',
          responses: {
            '200': { description: 'New token pair issued' },
            '401': { description: 'Refresh token expired or revoked' },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout and revoke refresh token',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Logged out' } },
        },
      },
      '/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Request password reset email',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } } } } },
          },
          responses: { '200': { description: 'Reset email sent (if account exists)' } },
        },
      },
      '/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password with token',
          responses: { '200': { description: 'Password reset successful' } },
        },
      },

      // ── Stores ────────────────────────────────────────────
      '/stores': {
        get: { tags: ['Stores'], summary: 'List all stores (Hub)', responses: { '200': { description: 'List of stores' } } },
        post: { tags: ['Stores'], summary: 'Create a new store', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Store created' } } },
      },
      '/stores/{id}': {
        get: { tags: ['Stores'], summary: 'Get store details', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Store details' } } },
        put: { tags: ['Stores'], summary: 'Update store', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Store updated' } } },
      },

      // ── Products ──────────────────────────────────────────
      '/products': {
        get: { tags: ['Products'], summary: 'List products (Hub or Store)', parameters: [{ name: 'store_id', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Paginated product list' } } },
        post: { tags: ['Products'], summary: 'Create a product', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Product created (draft or published based on verification status)' }, '403': { description: 'Product quota exceeded' } } },
      },
      '/products/{id}': {
        get: { tags: ['Products'], summary: 'Get product details', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product details' } } },
        put: { tags: ['Products'], summary: 'Update product', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Product updated' } } },
        delete: { tags: ['Products'], summary: 'Delete product', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Product deleted' } } },
      },
      '/products/import': { post: { tags: ['Products'], summary: 'Import products from JSON array (max 500)', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Import results' } } } },
      '/products/export': { get: { tags: ['Products'], summary: 'Export products as CSV', security: [{ BearerAuth: [] }], responses: { '200': { description: 'CSV file' } } } },

      // ── Orders ────────────────────────────────────────────
      '/orders': {
        get: { tags: ['Orders'], summary: 'List orders', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Order list' } } },
        post: { tags: ['Orders'], summary: 'Create order (checkout)', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Order created with per-vendor fulfillments' } } },
      },
      '/orders/{id}': { get: { tags: ['Orders'], summary: 'Get order details', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Order details' } } } },
      '/orders/{id}/fulfill': { put: { tags: ['Orders'], summary: 'Mark order as fulfilled', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Order fulfilled' } } } },
      '/orders/{id}/cancel': { put: { tags: ['Orders'], summary: 'Cancel order', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Order cancelled' } } } },

      // ── Payments ──────────────────────────────────────────
      '/payments/flouci/init': { post: { tags: ['Payments'], summary: 'Initiate Flouci payment', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Payment URL returned' } } } },
      '/payments/konnect/init': { post: { tags: ['Payments'], summary: 'Initiate Konnect payment', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Payment URL returned' } } } },
      '/payments/mandat/upload': { post: { tags: ['Payments'], summary: 'Upload Mandat Minute proof', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Proof uploaded' } } } },

      // ── Wallet ────────────────────────────────────────────
      '/wallet': { get: { tags: ['Wallet'], summary: 'Get wallet balance', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Wallet balance (available + pending)' } } } },
      '/wallet/transactions': { get: { tags: ['Wallet'], summary: 'Get transaction history', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Transaction list' } } } },
      '/wallet/withdraw': { post: { tags: ['Wallet'], summary: 'Request withdrawal', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Withdrawal requested' }, '400': { description: 'Insufficient funds' } } } },
      '/wallet/payout-mode': { put: { tags: ['Wallet'], summary: 'Change payout mode (automatic/on_demand)', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Payout mode updated' } } } },

      // ── Subscriptions ─────────────────────────────────────
      '/subscriptions/plans': { get: { tags: ['Subscriptions'], summary: 'List available plans', responses: { '200': { description: '7 subscription plans' } } } },
      '/subscriptions/current': { get: { tags: ['Subscriptions'], summary: 'Get current plan', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Current plan details' } } } },
      '/subscriptions/upgrade': { post: { tags: ['Subscriptions'], summary: 'Upgrade plan', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Plan upgraded' } } } },
      '/subscriptions/downgrade': { post: { tags: ['Subscriptions'], summary: 'Downgrade plan', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Plan downgraded' }, '400': { description: 'Downgrade blocked (exceeds new limits)' } } } },

      // ── Verification ──────────────────────────────────────
      '/verification/documents': { post: { tags: ['Verification'], summary: 'Submit KYC documents (RC + CIN)', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Documents submitted' } } } },
      '/verification/status': { get: { tags: ['Verification'], summary: 'Get verification status', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Verification status' } } } },

      // ── AI & Credits ──────────────────────────────────────
      '/ai/compress': { post: { tags: ['AI'], summary: 'Compress product image via sharp', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Compression job queued' }, '403': { description: 'Insufficient AI tokens' } } } },
      '/ai/seo-generate': { post: { tags: ['AI'], summary: 'Generate SEO title & description via Gemini Pro', security: [{ BearerAuth: [] }], responses: { '200': { description: 'SEO generation job queued' } } } },
      '/credits': { get: { tags: ['Credits'], summary: 'Get AI token balance', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Token balance' } } } },
      '/credits/purchase': { post: { tags: ['Credits'], summary: 'Purchase AI token pack', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Tokens added' } } } },

      // ── Reports ───────────────────────────────────────────
      '/reports': { post: { tags: ['Reports'], summary: 'Report a vendor for fraud', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Report created' } } } },

      // ── Search ────────────────────────────────────────────
      '/search': { get: { tags: ['Search'], summary: 'Search products (Meilisearch)', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }, { name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'price_min', in: 'query', schema: { type: 'number' } }, { name: 'price_max', in: 'query', schema: { type: 'number' } }], responses: { '200': { description: 'Search results' } } } },
      '/search/suggest': { get: { tags: ['Search'], summary: 'Autocomplete suggestions', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Top 8 suggestions' } } } },

      // ── Notifications ─────────────────────────────────────
      '/notifications': { get: { tags: ['Notifications'], summary: 'List notifications', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Notification list' } } } },
      '/notifications/unread-count': { get: { tags: ['Notifications'], summary: 'Get unread count', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Unread count' } } } },

      // ── Categories ────────────────────────────────────────
      '/categories': { get: { tags: ['Categories'], summary: 'List product categories', responses: { '200': { description: 'Category list' } } } },

      // ── Files ─────────────────────────────────────────────
      '/files/presign': { post: { tags: ['Files'], summary: 'Generate presigned upload URL', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Presigned URL for S3 upload' } } } },

      // ── Vendor API ────────────────────────────────────────
      '/vendor/products': { get: { tags: ['Vendor API'], summary: 'List vendor products (API key auth)', security: [{ ApiKeyAuth: [] }], responses: { '200': { description: 'Product list' } } } },
      '/vendor/orders': { get: { tags: ['Vendor API'], summary: 'List vendor orders (API key auth)', security: [{ ApiKeyAuth: [] }], responses: { '200': { description: 'Order list' } } } },
      '/vendor/api-keys': {
        get: { tags: ['Vendor API'], summary: 'List API keys', security: [{ BearerAuth: [] }], responses: { '200': { description: 'API key list' } } },
        post: { tags: ['Vendor API'], summary: 'Generate new API key', security: [{ BearerAuth: [] }], responses: { '201': { description: 'API key created (shown once)' } } },
      },
    },
  },
  // No file-based annotations needed — all paths defined inline above
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
