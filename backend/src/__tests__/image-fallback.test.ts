import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import sharp from 'sharp';
import crypto from 'crypto';

// Hoisted mocks for DB, S3 and Platform settings
const { mockQuery, mockS3Send, mockGetSettings } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockS3Send: vi.fn(),
  mockGetSettings: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  getPool: vi.fn(),
}));

vi.mock('../utils/s3', () => ({
  getS3: () => ({
    send: mockS3Send,
  }),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
  },
}));

vi.mock('../config', () => ({
  config: {
    storage: {
      r2AccountId: 'test-account-id',
      r2AccessKeyId: 'test-access-key',
      r2SecretAccessKey: 'test-secret',
      r2Bucket: 'pandamarket',
      cdnBaseUrl: 'https://cdn.garbage.team',
    },
    env: 'test',
  },
}));

import { imageVariantService } from '../services/image-variant.service';

/**
 * Helper to build an Express app with the static image fallback middleware mirroring main.ts
 */
function createFallbackApp() {
  const app = express();

  const sendImageBufferWithHeaders = (
    req: express.Request,
    res: express.Response,
    buffer: Buffer,
    contentType: string,
  ) => {
    const etag = `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', etag);
    res.status(200).send(buffer);
  };

  app.use(['/pd-product-images', '/pd-themes', '/pandamarket'], async (req, res, next) => {
    try {
      const bucket = req.baseUrl.replace(/^\//, '') || 'pd-product-images';
      let cleanKey = req.path.replace(/^\//, '');
      if (cleanKey.startsWith(`${bucket}/`)) {
        cleanKey = cleanKey.substring(bucket.length + 1);
      }
      const key1 = `${bucket}/${cleanKey}`;
      const key2 = cleanKey;

      // 1. Direct match in pd_file_blobs
      const { rows } = await mockQuery(
        'SELECT content_type, data FROM pd_file_blobs WHERE key = $1 OR key = $2 ORDER BY created_at DESC LIMIT 1',
        [key1, key2],
      );

      if (rows && rows.length > 0 && rows[0].data && rows[0].data.length > 0) {
        sendImageBufferWithHeaders(req, res, rows[0].data, rows[0].content_type || 'image/jpeg');
        return;
      }

      // 2. On-the-fly size variant generation if preset suffix requested
      const isVariant = /_(thumbnail|small|medium|large)\.webp$/i.test(cleanKey);
      if (isVariant) {
        const generated = await imageVariantService.getOrGenerateVariantOnTheFly(bucket, cleanKey);
        if (generated && generated.buffer && generated.buffer.length > 0) {
          sendImageBufferWithHeaders(req, res, generated.buffer, generated.contentType || 'image/webp');
          return;
        }
      }
    } catch {
      // Pass to next middleware
    }
    next();
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return app;
}

describe('Milestone 3: Dynamic On-The-Fly Generation & Edge Fallback Handler', () => {
  let sampleMasterJpg: Buffer;
  let sampleMasterPng: Buffer;

  beforeEach(async () => {
    vi.clearAllMocks();
    imageVariantService.inFlightVariantGenerations.clear();

    mockGetSettings.mockResolvedValue({
      image_size_thumbnail_w: 150,
      image_size_thumbnail_h: 150,
      image_size_thumbnail_crop: 'cover',
      image_size_small_w: 300,
      image_size_small_h: 300,
      image_size_small_crop: 'inside',
      image_size_medium_w: 600,
      image_size_medium_h: 600,
      image_size_medium_crop: 'inside',
      image_size_large_w: 1200,
      image_size_large_h: 1200,
      image_size_large_crop: 'inside',
      image_quality_webp: 85,
    });

    sampleMasterJpg = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 50, g: 100, b: 150 },
      },
    })
      .jpeg()
      .toBuffer();

    sampleMasterPng = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: { r: 200, g: 50, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockS3Send.mockImplementation(async (command: any) => {
      const key = command.input?.Key || '';
      if (command.input?.Body) {
        return {};
      }
      const err: any = new Error(`NoSuchKey: ${key}`);
      err.name = 'NoSuchKey';
      throw err;
    });
  });

  describe('1. Dynamic On-The-Fly Generation from Cloudflare R2 / Storage / DB', () => {
    it('generates missing WebP variant on-the-fly when master image exists in Cloudflare R2', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg')) {
          return {
            Body: {
              transformToByteArray: async () => sampleMasterJpg,
            },
          };
        }
        if (command.input?.Body) {
          return {};
        }
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/store_100/jacket_medium.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      expect(result?.buffer).toBeDefined();

      // Verify generated WebP image dimensions using Sharp
      const metadata = await sharp(result!.buffer).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBeLessThanOrEqual(600);
      expect(metadata.height).toBeLessThanOrEqual(600);

      // Verify all 4 variants were uploaded to R2 with immutable cache headers
      const putCalls = mockS3Send.mock.calls.filter(
        (call) => call[0].input && call[0].input.ContentType === 'image/webp',
      );
      expect(putCalls.length).toBe(4);
      expect(putCalls.map((c) => c[0].input.Key)).toEqual([
        'products/store_100/jacket_thumbnail.webp',
        'products/store_100/jacket_small.webp',
        'products/store_100/jacket_medium.webp',
        'products/store_100/jacket_large.webp',
      ]);
      expect(putCalls[0][0].input.CacheControl).toBe('public, max-age=31536000, immutable');
    });

    it('finds master original across various candidate extensions (.png, .jpeg, .jfif, .webp)', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.png')) {
          return {
            Body: {
              transformToByteArray: async () => sampleMasterPng,
            },
          };
        }
        if (command.input?.Body) {
          return {};
        }
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/store_100/icon_thumbnail.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');

      const metadata = await sharp(result!.buffer).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(150);
      expect(metadata.height).toBe(150);
    });

    it('returns existing variant from pd_file_blobs immediately without regenerating', async () => {
      const existingWebpBuffer = await sharp(sampleMasterPng).resize(300, 300).webp().toBuffer();

      mockQuery.mockResolvedValueOnce({
        rows: [{ data: existingWebpBuffer, content_type: 'image/webp' }],
        rowCount: 1,
      });

      const spyGenerate = vi.spyOn(imageVariantService, 'generateVariantsForBuffer');

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/store_100/existing_small.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      expect(result?.buffer).toEqual(existingWebpBuffer);
      expect(spyGenerate).not.toHaveBeenCalled();
    });

    it('returns existing variant from R2 if already present in R2 storage', async () => {
      const existingWebpBuffer = await sharp(sampleMasterPng).resize(1200, 1200).webp().toBuffer();

      // DB returns empty
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('_large.webp')) {
          return {
            Body: {
              transformToByteArray: async () => existingWebpBuffer,
            },
          };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const spyGenerate = vi.spyOn(imageVariantService, 'generateVariantsForBuffer');

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/store_100/r2_existing_large.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      expect(result?.buffer).toEqual(existingWebpBuffer);
      expect(spyGenerate).not.toHaveBeenCalled();
    });

    it('returns null immediately when requested key does not have a preset suffix', async () => {
      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/store_100/raw_image.png',
      );
      expect(result).toBeNull();
    });
  });

  describe('2. Single-Flight Concurrency Deduplication', () => {
    it('guarantees 10 concurrent requests for the same missing variant execute generation exactly ONCE', async () => {
      let getMasterCallCount = 0;

      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg')) {
          getMasterCallCount++;
          // Simulate realistic async network delay
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            Body: {
              transformToByteArray: async () => sampleMasterJpg,
            },
          };
        }
        if (command.input?.Body) {
          return {};
        }
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const spyGenerate = vi.spyOn(imageVariantService, 'generateVariantsForBuffer');

      // Launch 10 concurrent requests for the exact same variant
      const requestedVariant = 'products/store_concurrency/hot_item_small.webp';
      const promises = Array.from({ length: 10 }).map(() =>
        imageVariantService.getOrGenerateVariantOnTheFly('pd-product-images', requestedVariant),
      );

      // Verify in-flight map is populated during flight
      expect(imageVariantService.inFlightVariantGenerations.size).toBe(1);

      const results = await Promise.all(promises);

      // All 10 requests must receive valid non-null results
      expect(results.length).toBe(10);
      for (const res of results) {
        expect(res).not.toBeNull();
        expect(res?.contentType).toBe('image/webp');
        expect(res?.buffer.length).toBe(results[0]?.buffer.length);
      }

      // Assert generateVariantsForBuffer and S3 GetObject were invoked EXACTLY 1 time!
      expect(spyGenerate).toHaveBeenCalledTimes(1);
      expect(getMasterCallCount).toBe(1);

      // Assert deduplication map is cleared after completion
      expect(imageVariantService.inFlightVariantGenerations.size).toBe(0);
    });

    it('cleans up inFlightVariantGenerations map if generation fails', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const err: any = new Error('R2 Access Denied');
        err.name = 'AccessDenied';
        throw err;
      });

      const requestedVariant = 'products/store_concurrency/failed_item_large.webp';
      const promises = Array.from({ length: 5 }).map(() =>
        imageVariantService.getOrGenerateVariantOnTheFly('pd-product-images', requestedVariant),
      );

      const results = await Promise.all(promises);

      expect(results).toEqual([null, null, null, null, null]);
      expect(imageVariantService.inFlightVariantGenerations.size).toBe(0);
    });

    it('handles concurrent requests for different variant keys independently', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg')) {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return {
            Body: {
              transformToByteArray: async () => sampleMasterJpg,
            },
          };
        }
        if (command.input?.Body) {
          return {};
        }
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const spyGenerate = vi.spyOn(imageVariantService, 'generateVariantsForBuffer');

      const [res1, res2] = await Promise.all([
        imageVariantService.getOrGenerateVariantOnTheFly('pd-product-images', 'products/itemA_small.webp'),
        imageVariantService.getOrGenerateVariantOnTheFly('pd-product-images', 'products/itemB_medium.webp'),
      ]);

      expect(res1).not.toBeNull();
      expect(res2).not.toBeNull();
      expect(spyGenerate).toHaveBeenCalledTimes(2);
      expect(imageVariantService.inFlightVariantGenerations.size).toBe(0);
    });
  });

  describe('3. Express Fallback Middleware Integration', () => {
    const app = createFallbackApp();

    it('returns HTTP 200 with WebP headers and ETag on dynamic variant generation', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg')) {
          return {
            Body: {
              transformToByteArray: async () => sampleMasterJpg,
            },
          };
        }
        if (command.input?.Body) {
          return {};
        }
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const res = await request(app).get('/pd-product-images/products/store_1/dress_thumbnail.webp');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('image/webp');
      expect(res.header['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(res.header['etag']).toBeDefined();
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('returns HTTP 304 Not Modified when client provides matching If-None-Match ETag header', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg')) {
          return {
            Body: {
              transformToByteArray: async () => sampleMasterJpg,
            },
          };
        }
        if (command.input?.Body) {
          return {};
        }
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      // 1. Initial request to obtain ETag
      const res1 = await request(app).get('/pd-product-images/products/store_1/dress_thumbnail.webp');
      expect(res1.status).toBe(200);
      const etag = res1.header['etag'];
      expect(etag).toBeDefined();

      // 2. Subsequent conditional request with If-None-Match
      const res2 = await request(app)
        .get('/pd-product-images/products/store_1/dress_thumbnail.webp')
        .set('If-None-Match', etag);

      expect(res2.status).toBe(304);
      expect(res2.text).toBe('');
    });

    it('serves existing static blobs from pd_file_blobs with HTTP 200', async () => {
      const bannerBuffer = Buffer.from('RAW_BANNER_IMAGE_DATA');
      mockQuery.mockResolvedValueOnce({
        rows: [{ data: bannerBuffer, content_type: 'image/png' }],
        rowCount: 1,
      });

      const res = await request(app).get('/pd-themes/modern_theme/header_bg.png');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('image/png');
      expect(res.header['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(res.body.toString()).toBe('RAW_BANNER_IMAGE_DATA');
    });

    it('supports pandamarket bucket prefix route gracefully', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg')) {
          return {
            Body: {
              transformToByteArray: async () => sampleMasterJpg,
            },
          };
        }
        if (command.input?.Body) {
          return {};
        }
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const res = await request(app).get('/pandamarket/marketplace/banner_large.webp');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('image/webp');
      expect(res.header['cache-control']).toBe('public, max-age=31536000, immutable');
    });
  });

  describe('4. Graceful 404 Error Handling', () => {
    const app = createFallbackApp();

    it('returns HTTP 404 when neither variant nor master image exists anywhere', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const res = await request(app).get('/pd-product-images/products/nonexistent/ghost_small.webp');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });

    it('returns HTTP 404 for non-variant missing assets without triggering generation', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const spyGenerate = vi.spyOn(imageVariantService, 'generateVariantsForBuffer');

      const res = await request(app).get('/pd-product-images/documents/unknown.pdf');

      expect(res.status).toBe(404);
      expect(spyGenerate).not.toHaveBeenCalled();
    });

    it('handles corrupted master image gracefully and returns HTTP 404 without crashing', async () => {
      const corruptBuffer = Buffer.from('NOT_A_VALID_IMAGE_FILE_BUFFER');
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg') || key.endsWith('.png')) {
          return {
            Body: {
              transformToByteArray: async () => corruptBuffer,
            },
          };
        }
        if (command.input?.Body) {
          return {};
        }
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const res = await request(app).get('/pd-product-images/products/store_1/corrupt_medium.webp');

      expect(res.status).toBe(404);
    });
  });
});
