import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import sharp from 'sharp';
import express from 'express';
import request from 'supertest';
import { Job } from 'bullmq';

// Hoisted mocks
const { mockQuery, mockS3Send, mockGetSettings } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockS3Send: vi.fn(),
  mockGetSettings: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  getPool: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: vi.fn().mockImplementation(function (this: any, args: any) {
    this.input = args;
    return this;
  }),
  GetObjectCommand: vi.fn().mockImplementation(function (this: any, args: any) {
    this.input = args;
    return this;
  }),
  DeleteObjectCommand: vi.fn().mockImplementation(function (this: any, args: any) {
    this.input = args;
    return this;
  }),
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
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
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
    s3: {
      bucketPublic: 'pd-product-images',
    },
    env: 'test',
  },
}));

import { imageVariantService, ImageSizePreset } from '../services/image-variant.service';
import { enqueueImageVariantGeneration, imageQueue } from '../queues/image-queue';
import { processImageJob } from '../workers/image.worker';

describe('Milestone 5 Challenger: End-to-End Image Pipeline & Concurrency Verification', () => {
  let originalBuffer2400: Buffer;
  let originalBuffer200: Buffer;
  let texturedBuffer: Buffer;

  const defaultPlatformSettings = {
    image_quality_webp: 85,
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
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    imageVariantService.inFlightVariantGenerations.clear();

    originalBuffer2400 = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 4,
        background: { r: 120, g: 180, b: 240, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    originalBuffer200 = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 255, g: 100, b: 50 },
      },
    })
      .jpeg()
      .toBuffer();

    // Create high-entropy noise buffer for lossy compression tests
    const noisePixels = Buffer.alloc(400 * 300 * 3);
    for (let i = 0; i < noisePixels.length; i++) {
      noisePixels[i] = (i * 47 + (i % 251)) % 256;
    }
    texturedBuffer = await sharp(noisePixels, {
      raw: { width: 400, height: 300, channels: 3 },
    })
      .png()
      .toBuffer();

    mockS3Send.mockImplementation(async (cmd: any) => {
      const input = cmd?.input || cmd;
      if (input?.Body) {
        return {};
      }
      const err: any = new Error('NoSuchKey');
      err.name = 'NoSuchKey';
      throw err;
    });

    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    mockGetSettings.mockResolvedValue(defaultPlatformSettings);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Sharp 4 WebP Variants Generation & Metadata Inspection', () => {
    it('generates all 4 WebP variants with exact dimensions and crop constraints', async () => {
      const summary = await imageVariantService.generateVariantsForBuffer(
        originalBuffer2400,
        'pandamarket',
        'products/store_1/hero.png',
      );

      expect(summary.success).toBe(true);
      expect(summary.variants_generated.length).toBe(4);
      expect(summary.variants_generated).toEqual([
        'products/store_1/hero_thumbnail.webp',
        'products/store_1/hero_small.webp',
        'products/store_1/hero_medium.webp',
        'products/store_1/hero_large.webp',
      ]);

      const blobInserts = mockQuery.mock.calls.filter((call) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO pd_file_blobs'),
      );
      expect(blobInserts.length).toBeGreaterThanOrEqual(4);

      for (const call of blobInserts) {
        const buffer = call[1][2] as Buffer;
        expect(Buffer.isBuffer(buffer)).toBe(true);

        const meta = await sharp(buffer).metadata();
        expect(meta.format).toBe('webp');

        const key = call[1][0] as string;
        if (key.endsWith('_thumbnail.webp')) {
          expect(meta.width).toBe(150);
          expect(meta.height).toBe(150);
        } else if (key.endsWith('_small.webp')) {
          expect(meta.width).toBe(300);
          expect(meta.height).toBe(200);
        } else if (key.endsWith('_medium.webp')) {
          expect(meta.width).toBe(600);
          expect(meta.height).toBe(400);
        } else if (key.endsWith('_large.webp')) {
          expect(meta.width).toBe(1200);
          expect(meta.height).toBe(800);
        }
      }
    });

    it('adheres to withoutEnlargement: does not upscale small images beyond original dimensions for fit presets', async () => {
      const summary = await imageVariantService.generateVariantsForBuffer(
        originalBuffer200,
        'pandamarket',
        'products/store_1/icon.jpg',
      );

      expect(summary.success).toBe(true);

      const blobInserts = mockQuery.mock.calls.filter((call) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO pd_file_blobs'),
      );

      for (const call of blobInserts) {
        const buffer = call[1][2] as Buffer;
        const key = call[1][0] as string;
        const meta = await sharp(buffer).metadata();

        if (key.endsWith('_thumbnail.webp')) {
          expect(meta.width).toBe(150);
          expect(meta.height).toBe(150);
        } else if (key.endsWith('_small.webp') || key.endsWith('_medium.webp') || key.endsWith('_large.webp')) {
          expect(meta.width).toBe(200);
          expect(meta.height).toBe(200);
        }
      }
    });

    it('respects dynamic WebP quality settings from platform config', async () => {
      // 1. Generate at low quality (30)
      mockGetSettings.mockResolvedValue({
        ...defaultPlatformSettings,
        image_quality_webp: 30,
      });

      await imageVariantService.generateVariantsForBuffer(
        texturedBuffer,
        'pandamarket',
        'products/low_qual.png',
      );

      const lowQualCall = mockQuery.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO pd_file_blobs') && call[1][0].endsWith('_large.webp'),
      );
      const lowQualBuffer = lowQualCall![1][2] as Buffer;

      // 2. Generate at high quality (95)
      mockGetSettings.mockResolvedValue({
        ...defaultPlatformSettings,
        image_quality_webp: 95,
      });

      await imageVariantService.generateVariantsForBuffer(
        texturedBuffer,
        'pandamarket',
        'products/high_qual.png',
      );

      const highQualCall = mockQuery.mock.calls.findLast((call) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO pd_file_blobs') && call[1][0].endsWith('_large.webp'),
      );
      const highQualBuffer = highQualCall![1][2] as Buffer;

      expect(highQualBuffer.length).toBeGreaterThan(lowQualBuffer.length * 1.3);
    });
  });

  describe('2. Cloudflare R2 Upload Contract Verification', () => {
    it('uploads all variants to Cloudflare R2 with ContentType image/webp and immutable Cache-Control', async () => {
      mockS3Send.mockClear();

      await imageVariantService.generateVariantsForBuffer(
        originalBuffer2400,
        'pandamarket',
        'categories/electronics.png',
      );

      const putCalls = mockS3Send.mock.calls
        .map((call) => call[0]?.input || call[0])
        .filter((input) => input && input.Key && input.Key.includes('_'));

      expect(putCalls.length).toBe(4);

      const expectedPresets: ImageSizePreset[] = ['thumbnail', 'small', 'medium', 'large'];

      for (const preset of expectedPresets) {
        const input = putCalls.find(
          (c) => c.Key === `categories/electronics_${preset}.webp`,
        );
        expect(input).toBeDefined();
        expect(input!.Bucket).toBe('pandamarket');
        expect(input!.ContentType).toBe('image/webp');
        expect(input!.CacheControl).toBe('public, max-age=31536000, immutable');
        expect(Buffer.isBuffer(input!.Body)).toBe(true);
      }
    });

    it('updates pd_file_asset metadata JSONB with variant CDN URLs', async () => {
      await imageVariantService.generateVariantsForBuffer(
        originalBuffer2400,
        'pandamarket',
        'products/store_9/dress.jpg',
      );

      const assetUpdate = mockQuery.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('UPDATE pd_file_asset'),
      );

      expect(assetUpdate).toBeDefined();
      const metadata = JSON.parse(assetUpdate![1][0]);

      expect(metadata.variants).toBeDefined();
      expect(metadata.variants.thumbnail).toContain('products/store_9/dress_thumbnail.webp');
      expect(metadata.variants.small).toContain('products/store_9/dress_small.webp');
      expect(metadata.variants.medium).toContain('products/store_9/dress_medium.webp');
      expect(metadata.variants.large).toContain('products/store_9/dress_large.webp');
      expect(metadata.webp_quality).toBe(85);
      expect(metadata.original_dimensions).toEqual({ width: 2400, height: 1600 });
      expect(metadata.variants_generated_at).toBeDefined();
    });
  });

  describe('3. BullMQ Queue & Worker Lifecycle', () => {
    it('enqueues image processing job to BullMQ with retry options and unique jobId', async () => {
      const addSpy = vi.spyOn(imageQueue, 'add').mockResolvedValue({ id: 'job-123' } as any);

      const job = await enqueueImageVariantGeneration({
        fileKey: 'products/store_1/test.png',
        bucket: 'pandamarket',
        storeId: 'store_1',
        userId: 'user_42',
        purpose: 'product_image',
      });

      expect(job).toBeDefined();
      expect(addSpy).toHaveBeenCalledWith(
        'generate_variants',
        {
          fileKey: 'products/store_1/test.png',
          bucket: 'pandamarket',
          storeId: 'store_1',
          userId: 'user_42',
          purpose: 'product_image',
        },
        expect.objectContaining({
          jobId: expect.stringMatching(/^image-proc-products_store_1_test_png-\d+$/),
        }),
      );
    });

    it('worker processImageJob executes variant generation and updates asset context', async () => {
      vi.spyOn(imageVariantService, 'generateVariantsForFileKey').mockResolvedValueOnce({
        success: true,
        base_key: 'products/store_1/test.png',
        variants_generated: [
          'products/store_1/test_thumbnail.webp',
          'products/store_1/test_small.webp',
          'products/store_1/test_medium.webp',
          'products/store_1/test_large.webp',
        ],
      });

      const mockJob = {
        id: 'job-456',
        data: {
          fileKey: 'products/store_1/test.png',
          bucket: 'pandamarket',
          storeId: 'store_1',
          userId: 'user_42',
          purpose: 'product_image',
        },
        attemptsMade: 0,
      } as unknown as Job;

      const result = await processImageJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.variants_generated.length).toBe(4);

      const assetContextUpdate = mockQuery.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('UPDATE pd_file_asset') && call[0].includes('store_id = COALESCE'),
      );
      expect(assetContextUpdate).toBeDefined();
      expect(assetContextUpdate![1][0]).toBe('store_1');
      expect(assetContextUpdate![1][1]).toBe('user_42');
      expect(assetContextUpdate![1][2]).toBe('product_image');
    });

    it('worker processImageJob throws error when variant generation fails to allow BullMQ backoff retry', async () => {
      vi.spyOn(imageVariantService, 'generateVariantsForFileKey').mockResolvedValueOnce({
        success: false,
        base_key: 'products/corrupt.png',
        variants_generated: [],
      });

      const mockJob = {
        id: 'job-err',
        data: { fileKey: 'products/corrupt.png', bucket: 'pandamarket' },
        attemptsMade: 1,
      } as unknown as Job;

      await expect(processImageJob(mockJob)).rejects.toThrow(
        'Image variant generation failed or returned 0 variants for products/corrupt.png',
      );
    });
  });

  describe('4. Dynamic On-The-Fly Generation & Single-Flight Concurrency Lock', () => {
    it('generates on-the-fly when variant is missing and returns WebP buffer', async () => {
      const sampleVariantBuf = Buffer.from('generated_webp_content');

      mockQuery.mockImplementation(async (sql: string, params: any[]) => {
        if (typeof sql !== 'string') return { rows: [] };
        if (sql.includes('SELECT data, content_type FROM pd_file_blobs WHERE key = ANY')) {
          return { rows: [] }; // variant not in DB
        }
        if (sql.includes('SELECT data FROM pd_file_blobs WHERE key = ANY')) {
          return { rows: [{ data: originalBuffer2400 }] }; // original master found in DB
        }
        if (sql.includes('SELECT data, content_type FROM pd_file_blobs WHERE key = $1 OR key = $2')) {
          return { rows: [{ data: sampleVariantBuf, content_type: 'image/webp' }] };
        }
        return { rows: [], rowCount: 1 };
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pandamarket',
        'products/store_1/new_item_small.webp',
      );

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('image/webp');
      expect(result!.buffer).toEqual(sampleVariantBuf);
    });

    it('single-flight lock deduplicates 30 concurrent requests for the exact same ungenerated variant', async () => {
      let masterQueryCount = 0;
      const sampleVariantBuf = Buffer.from('mock_variant_buffer');

      mockQuery.mockImplementation(async (sql: string) => {
        if (typeof sql !== 'string') return { rows: [] };
        if (sql.includes('SELECT data, content_type FROM pd_file_blobs WHERE key = ANY')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT data FROM pd_file_blobs WHERE key = ANY')) {
          masterQueryCount++;
          return { rows: [{ data: originalBuffer2400 }] };
        }
        if (sql.includes('SELECT data, content_type FROM pd_file_blobs WHERE key = $1 OR key = $2')) {
          return { rows: [{ data: sampleVariantBuf, content_type: 'image/webp' }] };
        }
        return { rows: [], rowCount: 1 };
      });

      const concurrentRequests = Array.from({ length: 30 }, () =>
        imageVariantService.getOrGenerateVariantOnTheFly(
          'pandamarket',
          'products/store_concurrency/burst_large.webp',
        ),
      );

      const results = await Promise.all(concurrentRequests);

      expect(results.length).toBe(30);
      for (const res of results) {
        expect(res).not.toBeNull();
        expect(res!.contentType).toBe('image/webp');
        expect(res!.buffer).toEqual(sampleVariantBuf);
      }

      // Concurrency deduplication ensures generation runs only once
      expect(masterQueryCount).toBe(1);
    });

    it('returns null gracefully when original file does not exist anywhere', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      mockS3Send.mockRejectedValue(new Error('NoSuchKey'));

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pandamarket',
        'products/non_existent_small.webp',
      );

      expect(result).toBeNull();
    });
  });

  describe('5. Express Static Fallback Middleware Integration', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();

      const sendImageBufferWithHeaders = (req: express.Request, res: express.Response, buffer: Buffer, contentType: string) => {
        const etag = `W/"${buffer.length.toString(16)}"`;
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
          const bucket = req.baseUrl.replace(/^\//, '') || 'pandamarket';
          let cleanKey = req.path.replace(/^\//, '');
          if (cleanKey.startsWith(`${bucket}/`)) {
            cleanKey = cleanKey.substring(bucket.length + 1);
          }

          const isVariant = /_(thumbnail|small|medium|large)\.webp$/i.test(cleanKey);
          if (isVariant) {
            const generated = await imageVariantService.getOrGenerateVariantOnTheFly(bucket, cleanKey);
            if (generated && generated.buffer) {
              sendImageBufferWithHeaders(req, res, generated.buffer, generated.contentType || 'image/webp');
              return;
            }
          }
        } catch {
          // fallback
        }
        next();
      });
    });

    it('responds with HTTP 200, WebP headers, ETag, and immutable Cache-Control for variant requests', async () => {
      vi.spyOn(imageVariantService, 'getOrGenerateVariantOnTheFly').mockResolvedValueOnce({
        buffer: Buffer.from('sample_webp_binary_data'),
        contentType: 'image/webp',
      });

      const response = await request(app).get('/pandamarket/products/store_1/item_medium.webp');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/webp');
      expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(response.headers['etag']).toBeDefined();
    });

    it('responds with HTTP 304 Not Modified when ETag matches If-None-Match header', async () => {
      const sampleBuf = Buffer.from('cached_sample_webp');
      const expectedEtag = `W/"${sampleBuf.length.toString(16)}"`;

      vi.spyOn(imageVariantService, 'getOrGenerateVariantOnTheFly').mockResolvedValueOnce({
        buffer: sampleBuf,
        contentType: 'image/webp',
      });

      const response = await request(app)
        .get('/pandamarket/products/store_1/item_medium.webp')
        .set('If-None-Match', expectedEtag);

      expect(response.status).toBe(304);
      expect(response.text).toBe('');
    });
  });
});
