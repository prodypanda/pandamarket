import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserRole } from '@pandamarket/types';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((prefix: string) => `pd_${prefix}_test123`),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  childLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../utils/sentry', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('../services/report.service', () => ({
  reportService: {
    canAccessAttachmentKey: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('../services/chat.service', () => ({
  chatService: {
    canAccessAttachmentKey: vi.fn().mockResolvedValue(false),
    getChatLimits: vi.fn().mockResolvedValue({ maxImageSizeBytes: 5 * 1024 * 1024 }),
  },
}));

vi.mock('../services/file-asset.service', () => ({
  fileAssetService: {
    registerAsset: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../services/system-log.service', () => ({
  systemLogService: {
    captureError: vi.fn(),
  },
}));

import { query } from '../db/pool';
import { signMockFileToken, signAccessToken } from '../utils/jwt';
import filesRouter, { mockFilesRouter } from '../api/files.route';
import { errorHandler } from '../middlewares';

const mockQuery = vi.mocked(query);

function createDevApp() {
  const app = express();
  app.use(express.json());

  // Dummy auth middleware populating req.user if header present
  app.use((req: any, _res, next) => {
    const authHeader = req.headers['x-test-user'];
    if (authHeader) {
      req.user = JSON.parse(authHeader as string);
    }
    next();
  });

  const apiRouter = express.Router();
  apiRouter.use('/files', filesRouter);
  apiRouter.use('/files', mockFilesRouter);
  app.use('/api/pd', apiRouter);
  app.use(errorHandler);
  return app;
}

function createProdApp() {
  const app = express();
  app.use(express.json());

  const apiRouter = express.Router();
  apiRouter.use('/files', filesRouter);
  // mockFilesRouter NOT mounted in production
  app.use('/api/pd', apiRouter);
  app.use(errorHandler);
  return app;
}

describe('Files API & Secured S3 Mock Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mock S3 Upload & Download Security', () => {
    const devApp = createDevApp();

    it('1. anonymous upload rejected', async () => {
      const res = await request(devApp)
        .put('/api/pd/files/upload-s3-mock/pd-private/kyc/user_1/doc.pdf')
        .set('Content-Type', 'application/pdf')
        .send(Buffer.from('PDF content'));

      expect(res.status).toBe(401);
      expect(res.body?.error?.code).toBe('PD_AUTH_TOKEN_INVALID');
    });

    it('2. anonymous download rejected', async () => {
      const res = await request(devApp).get(
        '/api/pd/files/download-s3-mock/pd-private/kyc/user_1/doc.pdf',
      );

      expect(res.status).toBe(401);
      expect(res.body?.error?.code).toBe('PD_AUTH_TOKEN_INVALID');
    });

    it('3. cross-tenant download rejected', async () => {
      // User A creates a token bound to key 'kyc/user_A/doc.pdf'
      const tokenUserA = signMockFileToken({
        type: 'mock_file_download',
        bucket: 'pd-private',
        key: 'kyc/user_A/doc.pdf',
        owner_id: 'user_A',
        store_id: 'store_A',
        purpose: 'file_access',
        max_size: 0,
        content_type: '*/*',
      });

      // User A tries to download User B's file key using User A's token
      const res = await request(devApp).get(
        `/api/pd/files/download-s3-mock/pd-private/kyc/user_B/doc.pdf?token=${tokenUserA}`,
      );

      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe('PD_PERM_FORBIDDEN');
    });

    it('3b. cross-tenant access request rejected', async () => {
      // User A requests access URL for User B's file
      const userAToken = signAccessToken({
        sub: 'user_A',
        role: UserRole.Vendor,
        store_id: 'store_A',
      });

      const res = await request(devApp)
        .get('/api/pd/files/access?key=kyc/user_B/doc.pdf')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe('PD_PERM_FORBIDDEN');
    });

    it('4. expired token rejected', async () => {
      const expiredToken = signMockFileToken(
        {
          type: 'mock_file_upload',
          bucket: 'pd-private',
          key: 'kyc/user_1/doc.pdf',
          owner_id: 'user_1',
          store_id: null,
          purpose: 'kyc_document',
          max_size: 10 * 1024 * 1024,
          content_type: 'application/pdf',
        },
        -1, // expired 1 second ago
      );

      const res = await request(devApp)
        .put(`/api/pd/files/upload-s3-mock/pd-private/kyc/user_1/doc.pdf?token=${expiredToken}`)
        .set('Content-Type', 'application/pdf')
        .send(Buffer.from('PDF content'));

      expect(res.status).toBe(401);
      expect(res.body?.error?.code).toBe('PD_AUTH_TOKEN_EXPIRED');
    });

    it('5. oversized upload rejected', async () => {
      const smallSizeToken = signMockFileToken({
        type: 'mock_file_upload',
        bucket: 'pd-private',
        key: 'kyc/user_1/doc.pdf',
        owner_id: 'user_1',
        store_id: null,
        purpose: 'kyc_document',
        max_size: 10, // 10 bytes max
        content_type: 'application/pdf',
      });

      const oversizedPayload = Buffer.alloc(100, 'x');

      const res = await request(devApp)
        .put(`/api/pd/files/upload-s3-mock/pd-private/kyc/user_1/doc.pdf?token=${smallSizeToken}`)
        .set('Content-Type', 'application/pdf')
        .send(oversizedPayload);

      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('PD_VALIDATION_ERROR');
      expect(res.body?.error?.details?.code).toBe('PD_FILE_TOO_LARGE');
    });

    it('6. valid signed download succeeds', async () => {
      const fileData = Buffer.from('hello world private content');
      mockQuery.mockResolvedValueOnce({
        rows: [{ content_type: 'application/pdf', data: fileData }],
        rowCount: 1,
      } as any);

      const validToken = signMockFileToken({
        type: 'mock_file_download',
        bucket: 'pd-private',
        key: 'kyc/user_1/doc.pdf',
        owner_id: 'user_1',
        store_id: null,
        purpose: 'file_access',
        max_size: 0,
        content_type: '*/*',
      });

      const res = await request(devApp).get(
        `/api/pd/files/download-s3-mock/pd-private/kyc/user_1/doc.pdf?token=${validToken}`,
      );

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/pdf');
      expect(res.body.toString()).toBe('hello world private content');
    });
  });

  describe('Production Mode Security Isolation', () => {
    const prodApp = createProdApp();

    it('returns 404 for mock upload route in production boot', async () => {
      const token = signMockFileToken({
        type: 'mock_file_upload',
        bucket: 'pd-private',
        key: 'kyc/user_1/doc.pdf',
        owner_id: 'user_1',
        store_id: null,
        purpose: 'kyc_document',
        max_size: 10 * 1024 * 1024,
        content_type: 'application/pdf',
      });

      const res = await request(prodApp)
        .put(`/api/pd/files/upload-s3-mock/pd-private/kyc/user_1/doc.pdf?token=${token}`)
        .set('Content-Type', 'application/pdf')
        .send(Buffer.from('PDF content'));

      expect(res.status).toBe(404);
    });

    it('returns 404 for mock download route in production boot', async () => {
      const token = signMockFileToken({
        type: 'mock_file_download',
        bucket: 'pd-private',
        key: 'kyc/user_1/doc.pdf',
        owner_id: 'user_1',
        store_id: null,
        purpose: 'file_access',
        max_size: 0,
        content_type: '*/*',
      });

      const res = await request(prodApp).get(
        `/api/pd/files/download-s3-mock/pd-private/kyc/user_1/doc.pdf?token=${token}`,
      );

      expect(res.status).toBe(404);
    });
  });
});
