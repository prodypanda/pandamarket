import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import sharp from 'sharp';

const mockQuery = vi.fn();
const mockS3Send = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
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
    getSettings: vi.fn().mockResolvedValue({
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
    }),
  },
}));

import { imageVariantService } from '../services/image-variant.service';
import { StorageService } from '../services/storage.service';

describe('Challenger 2 Empirical Verification: Milestone 1 Multi-Tier Persistence & CDN URL Alignment', () => {
  let sampleSquareBuffer: Buffer;
  let sampleWideBuffer: Buffer;
  let sampleTallBuffer: Buffer;
  const originalCdnEnv = process.env.PD_CDN_BASE_URL;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockS3Send.mockResolvedValue({});
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    process.env.PD_CDN_BASE_URL = 'https://cdn.garbage.team';

    // Generate real valid sample images of various dimensions
    sampleSquareBuffer = await sharp({
      create: {
        width: 800,
        height: 800,
        channels: 4,
        background: { r: 50, g: 100, b: 150, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    sampleWideBuffer = await sharp({
      create: {
        width: 1600,
        height: 800,
        channels: 4,
        background: { r: 200, g: 80, b: 40, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    sampleTallBuffer = await sharp({
      create: {
        width: 600,
        height: 1800,
        channels: 4,
        background: { r: 80, g: 200, b: 40, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  afterEach(() => {
    if (originalCdnEnv !== undefined) {
      process.env.PD_CDN_BASE_URL = originalCdnEnv;
    } else {
      delete process.env.PD_CDN_BASE_URL;
    }
  });

  describe('Requirement 1: PutObjectCommand Headers Adherence (ContentType & CacheControl)', () => {
    it('verifies PutObjectCommand calls in ImageVariantService specify ContentType: image/webp and CacheControl: public, max-age=31536000, immutable for all 4 variants', async () => {
      const summary = await imageVariantService.generateVariantsForBuffer(
        sampleSquareBuffer,
        'pandamarket',
        'products/store_test/item_01.jpg',
      );

      expect(summary.success).toBe(true);
      expect(summary.variants_generated).toHaveLength(4);

      // Verify exactly 4 S3/R2 PutObjectCommand calls were made
      expect(mockS3Send).toHaveBeenCalledTimes(4);

      const putCommands = mockS3Send.mock.calls.map((call) => call[0].input);

      // 1. Thumbnail
      const thumbCmd = putCommands.find((c) => c.Key === 'products/store_test/item_01_thumbnail.webp');
      expect(thumbCmd).toBeDefined();
      expect(thumbCmd.ContentType).toBe('image/webp');
      expect(thumbCmd.CacheControl).toBe('public, max-age=31536000, immutable');
      expect(thumbCmd.Body).toBeInstanceOf(Buffer);

      // 2. Small
      const smallCmd = putCommands.find((c) => c.Key === 'products/store_test/item_01_small.webp');
      expect(smallCmd).toBeDefined();
      expect(smallCmd.ContentType).toBe('image/webp');
      expect(smallCmd.CacheControl).toBe('public, max-age=31536000, immutable');
      expect(smallCmd.Body).toBeInstanceOf(Buffer);

      // 3. Medium
      const medCmd = putCommands.find((c) => c.Key === 'products/store_test/item_01_medium.webp');
      expect(medCmd).toBeDefined();
      expect(medCmd.ContentType).toBe('image/webp');
      expect(medCmd.CacheControl).toBe('public, max-age=31536000, immutable');
      expect(medCmd.Body).toBeInstanceOf(Buffer);

      // 4. Large
      const largeCmd = putCommands.find((c) => c.Key === 'products/store_test/item_01_large.webp');
      expect(largeCmd).toBeDefined();
      expect(largeCmd.ContentType).toBe('image/webp');
      expect(largeCmd.CacheControl).toBe('public, max-age=31536000, immutable');
      expect(largeCmd.Body).toBeInstanceOf(Buffer);
    });

    it('verifies StorageService.uploadBuffer applies ContentType: image/webp and immutable CacheControl for WebP and variant keys', async () => {
      const mockStorageS3Send = vi.fn().mockResolvedValue({});
      const testStorage = new StorageService({
        r2AccountId: 'acc_test_id',
        r2AccessKeyId: 'key_test',
        r2SecretAccessKey: 'sec_test',
        r2Bucket: 'pandamarket',
        cdnBaseUrl: 'https://cdn.garbage.team',
      });

      // Replace internal s3 send with spy
      (testStorage as any).s3 = { send: mockStorageS3Send };

      // Case A: WebP upload without explicit cacheControl
      const resWebp = await testStorage.uploadBuffer(
        'products/store_1/test_small.webp',
        Buffer.from('fake-webp-bytes'),
        'image/webp',
      );
      expect(resWebp.success).toBe(true);
      expect(mockStorageS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'pandamarket',
            Key: 'products/store_1/test_small.webp',
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        }),
      );

      // Case B: Non-variant non-webp upload without underscores defaults to 86400
      mockStorageS3Send.mockClear();
      const resDoc = await testStorage.uploadBuffer(
        'docs/guide.pdf',
        Buffer.from('fake-pdf-bytes'),
        'application/pdf',
      );
      expect(resDoc.success).toBe(true);
      expect(mockStorageS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'pandamarket',
            Key: 'docs/guide.pdf',
            ContentType: 'application/pdf',
            CacheControl: 'public, max-age=86400',
          }),
        }),
      );

      // Case C: Explicit custom cacheControl overrides default
      mockStorageS3Send.mockClear();
      const resCustom = await testStorage.uploadBuffer(
        'products/store_1/custom.webp',
        Buffer.from('bytes'),
        'image/webp',
        'no-cache, no-store',
      );
      expect(resCustom.success).toBe(true);
      expect(mockStorageS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            CacheControl: 'no-cache, no-store',
          }),
        }),
      );
    });
  });

  describe('Requirement 2: Database pd_file_blobs & pd_file_asset Idempotent Persistence', () => {
    it('verifies pd_file_blobs queries include ON CONFLICT (key) DO UPDATE with updated content_type, data, and created_at', async () => {
      await imageVariantService.generateVariantsForBuffer(
        sampleSquareBuffer,
        'pandamarket',
        'products/store_test/idempotent_test.png',
      );

      // Inspect all SQL calls to query()
      const insertCalls = mockQuery.mock.calls.filter((call) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO pd_file_blobs'),
      );

      // 4 variants, each inserted with both scoped and unscoped keys
      expect(insertCalls.length).toBeGreaterThanOrEqual(4);

      for (const call of insertCalls) {
        const sql = call[0];
        const params = call[1];

        // Verify ON CONFLICT clause
        expect(sql).toContain('ON CONFLICT (key) DO UPDATE SET');
        expect(sql).toContain('content_type = EXCLUDED.content_type');
        expect(sql).toContain('data = EXCLUDED.data');
        expect(sql).toContain('created_at = NOW()');

        // Verify parameter structure: key, bucket, variantBuffer
        expect(params[1]).toBe('pandamarket');
        expect(params[2]).toBeInstanceOf(Buffer);
      }
    });

    it('verifies repeated executions on the same key succeed idempotently without duplicate key errors', async () => {
      // Run 1
      const res1 = await imageVariantService.generateVariantsForBuffer(
        sampleSquareBuffer,
        'pandamarket',
        'products/store_test/repeated.jpg',
      );
      expect(res1.success).toBe(true);

      // Run 2 (Simulating re-processing or duplicate trigger)
      const res2 = await imageVariantService.generateVariantsForBuffer(
        sampleSquareBuffer,
        'pandamarket',
        'products/store_test/repeated.jpg',
      );
      expect(res2.success).toBe(true);
      expect(res2.variants_generated).toEqual(res1.variants_generated);
    });

    it('verifies pd_file_asset updates merge JSONB metadata preserving existing fields via COALESCE and ||', async () => {
      await imageVariantService.generateVariantsForBuffer(
        sampleSquareBuffer,
        'pandamarket',
        'products/store_test/metadata_merge.jpg',
      );

      const assetUpdateCall = mockQuery.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('UPDATE pd_file_asset'),
      );

      expect(assetUpdateCall).toBeDefined();
      const [sql, params] = assetUpdateCall!;

      // SQL contains JSONB merge operator
      expect(sql).toContain("metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb");
      expect(sql).toContain('updated_at = NOW()');
      expect(sql).toContain('WHERE file_key = $2 OR file_key = $3 OR file_key LIKE $4 OR url LIKE $4');

      // Check metadata update content
      const payload = JSON.parse(params[0]);
      expect(payload).toHaveProperty('variants');
      expect(payload.variants).toHaveProperty('thumbnail');
      expect(payload.variants).toHaveProperty('small');
      expect(payload.variants).toHaveProperty('medium');
      expect(payload.variants).toHaveProperty('large');
      expect(payload.webp_quality).toBe(82);
      expect(payload.original_dimensions).toEqual({ width: 800, height: 800 });
      expect(payload.variants_generated_at).toBeDefined();
    });
  });

  describe('Requirement 3: CDN URL Exact Format Alignment', () => {
    it('verifies storageService.getPublicUrl generates correct CDN URLs for various variant patterns', () => {
      const storage = new StorageService({
        r2AccountId: 'test_acc',
        r2AccessKeyId: 'test_key',
        r2SecretAccessKey: 'test_sec',
        cdnBaseUrl: 'https://cdn.garbage.team',
      });

      expect(storage.getPublicUrl('products/store_1/item_thumbnail.webp')).toBe(
        'https://cdn.garbage.team/products/store_1/item_thumbnail.webp',
      );
      expect(storage.getPublicUrl('pd-product-images/products/store_1/item_small.webp')).toBe(
        'https://cdn.garbage.team/products/store_1/item_small.webp',
      );
      expect(storage.getPublicUrl('/products/store_1/item_medium.webp')).toBe(
        'https://cdn.garbage.team/products/store_1/item_medium.webp',
      );
      expect(storage.getPublicUrl('products/store_1/item_large.webp')).toBe(
        'https://cdn.garbage.team/products/store_1/item_large.webp',
      );
    });

    it('verifies imageVariantService metadata variants map to https://cdn.garbage.team/... WebP URLs', async () => {
      process.env.PD_CDN_BASE_URL = 'https://cdn.garbage.team';

      await imageVariantService.generateVariantsForBuffer(
        sampleSquareBuffer,
        'pandamarket',
        'products/store_cdn/product_a.png',
      );

      const assetCall = mockQuery.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('UPDATE pd_file_asset'),
      );
      expect(assetCall).toBeDefined();

      const payload = JSON.parse(assetCall![1][0]);
      const variants = payload.variants;

      expect(variants.thumbnail).toBe('https://cdn.garbage.team/products/store_cdn/product_a_thumbnail.webp');
      expect(variants.small).toBe('https://cdn.garbage.team/products/store_cdn/product_a_small.webp');
      expect(variants.medium).toBe('https://cdn.garbage.team/products/store_cdn/product_a_medium.webp');
      expect(variants.large).toBe('https://cdn.garbage.team/products/store_cdn/product_a_large.webp');
    });

    it('verifies CDN URL sanitization prevents duplicate slashes with trailing slashes in configuration', () => {
      const storageWithSlash = new StorageService({
        r2AccountId: 'acc',
        r2AccessKeyId: 'key',
        r2SecretAccessKey: 'sec',
        cdnBaseUrl: 'https://cdn.garbage.team///',
      });

      const url = storageWithSlash.getPublicUrl('/products/shoes_small.webp');
      expect(url).toBe('https://cdn.garbage.team/products/shoes_small.webp');
    });
  });

  describe('Requirement 4: Empirical Sharp WebP Resizing & Aspect Ratio Conformance', () => {
    it('generates genuine WebP format buffers with valid magic bytes (RIFF...WEBP)', async () => {
      await imageVariantService.generateVariantsForBuffer(
        sampleSquareBuffer,
        'pandamarket',
        'products/magic_check.png',
      );

      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);
      for (const cmd of putCalls) {
        const buf = cmd.Body as Buffer;
        // Check RIFF header and WEBP signature
        expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
        expect(buf.toString('ascii', 8, 12)).toBe('WEBP');

        // Decode with sharp to confirm valid WebP metadata
        const meta = await sharp(buf).metadata();
        expect(meta.format).toBe('webp');
      }
    });

    it('accurately calculates aspect ratios for wide banner images (1600x800)', async () => {
      await imageVariantService.generateVariantsForBuffer(
        sampleWideBuffer,
        'pandamarket',
        'banners/hero.png',
      );

      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);

      // 1. Thumbnail (150x150 cover)
      const thumbBuf = putCalls.find((c) => c.Key === 'banners/hero_thumbnail.webp')?.Body as Buffer;
      const thumbMeta = await sharp(thumbBuf).metadata();
      expect(thumbMeta.width).toBe(150);
      expect(thumbMeta.height).toBe(150);

      // 2. Small (300x300 inside fit for 1600x800 -> 300x150)
      const smallBuf = putCalls.find((c) => c.Key === 'banners/hero_small.webp')?.Body as Buffer;
      const smallMeta = await sharp(smallBuf).metadata();
      expect(smallMeta.width).toBe(300);
      expect(smallMeta.height).toBe(150);

      // 3. Medium (600x600 inside fit for 1600x800 -> 600x300)
      const medBuf = putCalls.find((c) => c.Key === 'banners/hero_medium.webp')?.Body as Buffer;
      const medMeta = await sharp(medBuf).metadata();
      expect(medMeta.width).toBe(600);
      expect(medMeta.height).toBe(300);

      // 4. Large (1200x1200 inside fit for 1600x800 -> 1200x600)
      const largeBuf = putCalls.find((c) => c.Key === 'banners/hero_large.webp')?.Body as Buffer;
      const largeMeta = await sharp(largeBuf).metadata();
      expect(largeMeta.width).toBe(1200);
      expect(largeMeta.height).toBe(600);
    });

    it('accurately calculates aspect ratios for tall portrait images (600x1800)', async () => {
      await imageVariantService.generateVariantsForBuffer(
        sampleTallBuffer,
        'pandamarket',
        'fashion/dress.png',
      );

      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);

      // 1. Thumbnail (150x150 cover)
      const thumbBuf = putCalls.find((c) => c.Key === 'fashion/dress_thumbnail.webp')?.Body as Buffer;
      const thumbMeta = await sharp(thumbBuf).metadata();
      expect(thumbMeta.width).toBe(150);
      expect(thumbMeta.height).toBe(150);

      // 2. Small (300x300 inside fit for 600x1800 -> 100x300)
      const smallBuf = putCalls.find((c) => c.Key === 'fashion/dress_small.webp')?.Body as Buffer;
      const smallMeta = await sharp(smallBuf).metadata();
      expect(smallMeta.width).toBe(100);
      expect(smallMeta.height).toBe(300);

      // 3. Medium (600x600 inside fit for 600x1800 -> 200x600)
      const medBuf = putCalls.find((c) => c.Key === 'fashion/dress_medium.webp')?.Body as Buffer;
      const medMeta = await sharp(medBuf).metadata();
      expect(medMeta.width).toBe(200);
      expect(medMeta.height).toBe(600);

      // 4. Large (1200x1200 inside fit for 600x1800 -> 400x1200)
      const largeBuf = putCalls.find((c) => c.Key === 'fashion/dress_large.webp')?.Body as Buffer;
      const largeMeta = await sharp(largeBuf).metadata();
      expect(largeMeta.width).toBe(400);
      expect(largeMeta.height).toBe(1200);
    });
  });

  describe('Requirement 5: Robust Error Recovery & Edge Cases', () => {
    it('gracefully handles S3/R2 upload failures without aborting DB persistence', async () => {
      mockS3Send.mockRejectedValueOnce(new Error('S3 Network Timeout'));

      const summary = await imageVariantService.generateVariantsForBuffer(
        sampleSquareBuffer,
        'pandamarket',
        'products/s3_error_test.jpg',
      );

      // Still considered success for generated variants persisted in DB
      expect(summary.success).toBe(true);
      expect(summary.variants_generated.length).toBeGreaterThan(0);
    });

    it('gracefully handles empty buffer and corrupted buffer input', async () => {
      const emptyRes = await imageVariantService.generateVariantsForBuffer(
        Buffer.alloc(0),
        'pandamarket',
        'empty.png',
      );
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.variants_generated).toHaveLength(0);

      const corruptRes = await imageVariantService.generateVariantsForBuffer(
        Buffer.from('not an image at all'),
        'pandamarket',
        'corrupt.png',
      );
      expect(corruptRes.success).toBe(false);
      expect(corruptRes.variants_generated).toHaveLength(0);
    });
  });
});
