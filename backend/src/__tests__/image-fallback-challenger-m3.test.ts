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
      r2AccountId: 'test-r2-account-id',
      r2AccessKeyId: 'test-r2-access-key',
      r2SecretAccessKey: 'test-r2-secret',
      r2Bucket: 'pandamarket',
      cdnBaseUrl: 'https://cdn.garbage.team',
    },
    env: 'test',
  },
}));

import { imageVariantService } from '../services/image-variant.service';

/**
 * Builds the exact fallback app as configured in main.ts
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

  app.get('/storage/v1/object/public/:bucket/*', (req, res) => {
    const bucket = req.params.bucket;
    const fileKey = (req.params as Record<string, string>)[0] || '';
    res.redirect(`/${bucket}/${fileKey}`);
  });

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
      // Pass through to next
    }
    next();
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return app;
}

describe('Challenger M3 Stress Test: Dynamic On-The-Fly Generation & Edge Fallback Handler', () => {
  let sampleJpeg: Buffer;
  let samplePng: Buffer;
  let sampleWebp: Buffer;
  let sampleGif: Buffer;

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
      image_quality_webp: 82,
    });

    sampleJpeg = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 100, g: 150, b: 200 } },
    }).jpeg().toBuffer();

    samplePng = await sharp({
      create: { width: 500, height: 500, channels: 4, background: { r: 255, g: 120, b: 0, alpha: 0.8 } },
    }).png().toBuffer();

    sampleWebp = await sharp({
      create: { width: 640, height: 480, channels: 3, background: { r: 50, g: 200, b: 50 } },
    }).webp().toBuffer();

    sampleGif = await sharp({
      create: { width: 320, height: 240, channels: 3, background: { r: 200, g: 50, b: 200 } },
    }).gif().toBuffer();

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

  describe('Objective 1: High Concurrency Burst (50 concurrent requests)', () => {
    it('50 concurrent requests for the exact same ungenerated variant execute single-flight with 0 race conditions', async () => {
      let masterFetchCount = 0;

      // Simulate realistic network delay on S3 master fetch
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpeg') || key.endsWith('.jpg')) {
          masterFetchCount++;
          await new Promise((resolve) => setTimeout(resolve, 60));
          return {
            Body: {
              transformToByteArray: async () => sampleJpeg,
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

      const app = createFallbackApp();
      const variantUrl = '/pd-product-images/products/store_burst/high_concurrency_medium.webp';

      // Launch 50 concurrent HTTP requests through Express app
      const requests = Array.from({ length: 50 }).map(() => request(app).get(variantUrl));

      const responses = await Promise.all(requests);

      // Verify all 50 requests succeed with HTTP 200
      expect(responses.length).toBe(50);
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.header['content-type']).toBe('image/webp');
        expect(res.header['cache-control']).toBe('public, max-age=31536000, immutable');
        expect(res.header['etag']).toBeDefined();
        expect(res.body).toBeInstanceOf(Buffer);
        expect(res.body.length).toBeGreaterThan(0);

        // Verify magic bytes RIFF...WEBP
        expect(res.body.toString('ascii', 0, 4)).toBe('RIFF');
        expect(res.body.toString('ascii', 8, 12)).toBe('WEBP');
      }

      // Verify exact byte equality across all 50 response buffers
      const firstBuffer = responses[0].body;
      for (let i = 1; i < responses.length; i++) {
        expect(responses[i].body.equals(firstBuffer)).toBe(true);
      }

      // Single-flight execution guarantee: generateVariantsForBuffer called exactly ONCE!
      expect(spyGenerate).toHaveBeenCalledTimes(1);
      expect(masterFetchCount).toBe(1);

      // In-flight map is completely cleared after burst finishes
      expect(imageVariantService.inFlightVariantGenerations.size).toBe(0);
    });

    it('50 concurrent direct service calls for the exact same variant resolve with identical buffers and single execution', async () => {
      let masterFetchCount = 0;

      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg') || key.endsWith('.png')) {
          masterFetchCount++;
          await new Promise((resolve) => setTimeout(resolve, 40));
          return {
            Body: {
              transformToByteArray: async () => samplePng,
            },
          };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const spyGenerate = vi.spyOn(imageVariantService, 'generateVariantsForBuffer');

      const requestedKey = 'products/store_999/burst_test_small.webp';
      const promises = Array.from({ length: 50 }).map(() =>
        imageVariantService.getOrGenerateVariantOnTheFly('pd-product-images', requestedKey),
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(50);
      for (const res of results) {
        expect(res).not.toBeNull();
        expect(res?.contentType).toBe('image/webp');
        expect(res?.buffer).toBeDefined();
        const meta = await sharp(res!.buffer).metadata();
        expect(meta.format).toBe('webp');
      }

      expect(spyGenerate).toHaveBeenCalledTimes(1);
      expect(masterFetchCount).toBe(1);
      expect(imageVariantService.inFlightVariantGenerations.size).toBe(0);
    });

    it('50 concurrent requests for 5 distinct variant keys trigger exactly 5 single-flight executions', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.includes('master_') && (key.endsWith('.jpg') || key.endsWith('.jpeg') || key.endsWith('.png'))) {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return {
            Body: {
              transformToByteArray: async () => sampleJpeg,
            },
          };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const spyGenerate = vi.spyOn(imageVariantService, 'generateVariantsForBuffer');

      const variantKeys = [
        'products/item_1/master_1_thumbnail.webp',
        'products/item_2/master_2_small.webp',
        'products/item_3/master_3_medium.webp',
        'products/item_4/master_4_large.webp',
        'products/item_5/master_5_medium.webp',
      ];

      // 10 requests each for 5 distinct keys = 50 total concurrent requests
      const promises: Promise<any>[] = [];
      for (const key of variantKeys) {
        for (let i = 0; i < 10; i++) {
          promises.push(imageVariantService.getOrGenerateVariantOnTheFly('pd-product-images', key));
        }
      }

      const results = await Promise.all(promises);

      expect(results.length).toBe(50);
      for (const res of results) {
        expect(res).not.toBeNull();
        expect(res?.contentType).toBe('image/webp');
      }

      // Exactly 5 distinct variant generations
      expect(spyGenerate).toHaveBeenCalledTimes(5);
      expect(imageVariantService.inFlightVariantGenerations.size).toBe(0);
    });

    it('cleans up inFlightVariantGenerations when all 50 concurrent requests fail on missing master', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      mockS3Send.mockImplementation(async (command: any) => {
        const err: any = new Error('NoSuchKey');
        err.name = 'NoSuchKey';
        throw err;
      });

      const app = createFallbackApp();
      const requests = Array.from({ length: 50 }).map(() =>
        request(app).get('/pd-product-images/products/ghost/missing_large.webp'),
      );

      const responses = await Promise.all(requests);

      expect(responses.length).toBe(50);
      for (const res of responses) {
        expect(res.status).toBe(404);
      }

      expect(imageVariantService.inFlightVariantGenerations.size).toBe(0);
    });
  });

  describe('Objective 2: Candidate Extension Resolution (.jpeg, .jfif, .png, .webp, .gif)', () => {
    it('resolves master image with .jpeg extension in R2 storage', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key === 'products/catalog/photo.jpeg') {
          return {
            Body: { transformToByteArray: async () => sampleJpeg },
          };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/catalog/photo_medium.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      const meta = await sharp(result!.buffer).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBeLessThanOrEqual(600);
    });

    it('resolves master image with .jfif extension in R2 storage', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key === 'products/catalog/camera_shot.jfif') {
          return {
            Body: { transformToByteArray: async () => sampleJpeg },
          };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/catalog/camera_shot_thumbnail.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      const meta = await sharp(result!.buffer).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBe(150);
      expect(meta.height).toBe(150);
    });

    it('resolves master image with .png extension in DB blobs', async () => {
      mockQuery.mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT data FROM pd_file_blobs')) {
          const keys = params[0] as string[];
          if (keys.includes('pd-product-images/store/logo.png') || keys.includes('store/logo.png')) {
            return { rows: [{ data: samplePng }], rowCount: 1 };
          }
        }
        return { rows: [], rowCount: 0 };
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'store/logo_small.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      const meta = await sharp(result!.buffer).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBeLessThanOrEqual(300);
      expect(meta.height).toBeLessThanOrEqual(300);
    });

    it('resolves master image with .webp extension in R2 storage', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key === 'marketing/summer_hero.webp') {
          return {
            Body: { transformToByteArray: async () => sampleWebp },
          };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-themes',
        'marketing/summer_hero_large.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      const meta = await sharp(result!.buffer).metadata();
      expect(meta.format).toBe('webp');
    });

    it('resolves master image with .gif extension in R2 storage', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key === 'animations/loader.gif') {
          return {
            Body: { transformToByteArray: async () => sampleGif },
          };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-themes',
        'animations/loader_thumbnail.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      const meta = await sharp(result!.buffer).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBe(150);
      expect(meta.height).toBe(150);
    });

    it('resolves master image with raw base key without extension', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key === 'raw_assets/unnamed_blob') {
          return {
            Body: { transformToByteArray: async () => sampleJpeg },
          };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'raw_assets/unnamed_blob_small.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
    });

    it('resolves master image with multiple dots in filename (e.g. v2.preview.final.png)', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key === 'products/item.v2.preview.final.png') {
          return {
            Body: { transformToByteArray: async () => samplePng },
          };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/item.v2.preview.final_medium.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
    });
  });

  describe('Objective 3: Edge Fallback HTTP Response Headers & Caching', () => {
    const app = createFallbackApp();

    it('verifies Content-Type, immutable Cache-Control, and MD5 ETag headers on dynamic generation', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg')) {
          return { Body: { transformToByteArray: async () => sampleJpeg } };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const res = await request(app).get('/pd-product-images/products/headers_test/shoe_large.webp');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('image/webp');
      expect(res.header['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(res.header['etag']).toMatch(/^"[a-f0-9]{32}"$/);

      // Verify MD5 hash computation matches actual body bytes
      const expectedEtag = `"` + crypto.createHash('md5').update(res.body).digest('hex') + `"`;
      expect(res.header['etag']).toBe(expectedEtag);
    });

    it('returns HTTP 304 Not Modified when client sends matching If-None-Match ETag', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg')) {
          return { Body: { transformToByteArray: async () => sampleJpeg } };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      // 1. Initial GET
      const res1 = await request(app).get('/pd-product-images/products/cache_test/item_small.webp');
      expect(res1.status).toBe(200);
      const etag = res1.header['etag'];
      expect(etag).toBeDefined();

      // 2. Re-request with If-None-Match header
      const res2 = await request(app)
        .get('/pd-product-images/products/cache_test/item_small.webp')
        .set('If-None-Match', etag);

      expect(res2.status).toBe(304);
      expect(res2.text).toBe('');
    });

    it('returns HTTP 200 when client sends non-matching If-None-Match ETag', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.jpg')) {
          return { Body: { transformToByteArray: async () => sampleJpeg } };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      const res = await request(app)
        .get('/pd-product-images/products/cache_test/item_small.webp')
        .set('If-None-Match', '"outdated_etag_hash"');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('image/webp');
    });

    it('verifies all 3 supported bucket routes (/pd-product-images, /pd-themes, /pandamarket)', async () => {
      mockS3Send.mockImplementation(async (command: any) => {
        const key = command.input?.Key || '';
        if (key.endsWith('.png')) {
          return { Body: { transformToByteArray: async () => samplePng } };
        }
        if (command.input?.Body) return {};
        const err: any = new Error(`NoSuchKey: ${key}`);
        err.name = 'NoSuchKey';
        throw err;
      });

      // Route 1: /pd-product-images
      const res1 = await request(app).get('/pd-product-images/products/p1_thumbnail.webp');
      expect(res1.status).toBe(200);
      expect(res1.header['content-type']).toBe('image/webp');

      // Route 2: /pd-themes
      const res2 = await request(app).get('/pd-themes/modern/hero_banner_large.webp');
      expect(res2.status).toBe(200);
      expect(res2.header['content-type']).toBe('image/webp');

      // Route 3: /pandamarket
      const res3 = await request(app).get('/pandamarket/marketplace/promo_medium.webp');
      expect(res3.status).toBe(200);
      expect(res3.header['content-type']).toBe('image/webp');
    });

    it('verifies legacy Supabase storage redirect /storage/v1/object/public/:bucket/*', async () => {
      const res = await request(app).get(
        '/storage/v1/object/public/pd-product-images/products/store_1/item_small.webp',
      );

      expect(res.status).toBe(302);
      expect(res.header['location']).toBe('/pd-product-images/products/store_1/item_small.webp');
    });
  });
});
