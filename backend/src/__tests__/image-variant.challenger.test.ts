import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';

const mockQuery = vi.fn();
const mockS3Send = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: mockS3Send,
    })),
    PutObjectCommand: vi.fn().mockImplementation((args) => ({ input: args })),
    GetObjectCommand: vi.fn().mockImplementation((args) => ({ input: args })),
    DeleteObjectCommand: vi.fn().mockImplementation((args) => ({ input: args })),
  };
});

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
    getSettings: vi.fn(),
  },
}));

import { imageVariantService } from '../services/image-variant.service';
import { platformConfigService } from '../services/platform-config.service';
import { StorageService } from '../services/storage.service';

describe('CHALLENGER STRESS SUITE: Multi-Size WebP Variant Generation & Cloudflare R2 Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockS3Send.mockResolvedValue({});
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    vi.mocked(platformConfigService.getSettings).mockResolvedValue({
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
    } as any);
  });

  describe('1. Extreme Image Dimensions & Aspect Ratios', () => {
    it('handles 1x1 pixel image correctly (tiny minimum image)', async () => {
      const tiny1x1 = await sharp({
        create: {
          width: 1,
          height: 1,
          channels: 4,
          background: { r: 0, g: 128, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const summary = await imageVariantService.generateVariantsForBuffer(
        tiny1x1,
        'pd-product-images',
        'products/test_1x1.png',
      );

      expect(summary.success).toBe(true);
      expect(summary.variants_generated).toHaveLength(4);
      expect(mockS3Send).toHaveBeenCalledTimes(4);

      // Verify each generated variant buffer using sharp metadata
      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);

      // Thumbnail: cover mode scales to configured preset 150x150
      const thumbMeta = await sharp(putCalls[0].Body as Buffer).metadata();
      expect(thumbMeta.format).toBe('webp');
      expect(thumbMeta.width).toBe(150);
      expect(thumbMeta.height).toBe(150);

      // Small: inside mode with withoutEnlargement: true keeps 1x1
      const smallMeta = await sharp(putCalls[1].Body as Buffer).metadata();
      expect(smallMeta.format).toBe('webp');
      expect(smallMeta.width).toBe(1);
      expect(smallMeta.height).toBe(1);

      // Medium: inside mode with withoutEnlargement: true keeps 1x1
      const mediumMeta = await sharp(putCalls[2].Body as Buffer).metadata();
      expect(mediumMeta.format).toBe('webp');
      expect(mediumMeta.width).toBe(1);
      expect(mediumMeta.height).toBe(1);

      // Large: inside mode with withoutEnlargement: true keeps 1x1
      const largeMeta = await sharp(putCalls[3].Body as Buffer).metadata();
      expect(largeMeta.format).toBe('webp');
      expect(largeMeta.width).toBe(1);
      expect(largeMeta.height).toBe(1);
    });

    it('handles 4000x3000 high-resolution image and properly downscales to 4 presets', async () => {
      const highRes = await sharp({
        create: {
          width: 4000,
          height: 3000,
          channels: 3,
          background: { r: 200, g: 100, b: 50 },
        },
      })
        .jpeg()
        .toBuffer();

      const summary = await imageVariantService.generateVariantsForBuffer(
        highRes,
        'pd-product-images',
        'products/store_42/banner_4k.jpg',
      );

      expect(summary.success).toBe(true);
      expect(summary.variants_generated).toHaveLength(4);

      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);

      // Thumbnail (150x150 cover)
      const thumbMeta = await sharp(putCalls[0].Body as Buffer).metadata();
      expect(thumbMeta.format).toBe('webp');
      expect(thumbMeta.width).toBe(150);
      expect(thumbMeta.height).toBe(150);

      // Small (300x300 inside => 300x225 for 4:3)
      const smallMeta = await sharp(putCalls[1].Body as Buffer).metadata();
      expect(smallMeta.format).toBe('webp');
      expect(smallMeta.width).toBe(300);
      expect(smallMeta.height).toBe(225);

      // Medium (600x600 inside => 600x450 for 4:3)
      const medMeta = await sharp(putCalls[2].Body as Buffer).metadata();
      expect(medMeta.format).toBe('webp');
      expect(medMeta.width).toBe(600);
      expect(medMeta.height).toBe(450);

      // Large (1200x1200 inside => 1200x900 for 4:3)
      const largeMeta = await sharp(putCalls[3].Body as Buffer).metadata();
      expect(largeMeta.format).toBe('webp');
      expect(largeMeta.width).toBe(1200);
      expect(largeMeta.height).toBe(900);
    });

    it('handles 10000x50 extreme horizontal panoramic ribbon without distortion or crash', async () => {
      const panoHorizontal = await sharp({
        create: {
          width: 10000,
          height: 50,
          channels: 3,
          background: { r: 10, g: 200, b: 10 },
        },
      })
        .png()
        .toBuffer();

      const summary = await imageVariantService.generateVariantsForBuffer(
        panoHorizontal,
        'pd-product-images',
        'theme/panoramic_ribbon.png',
      );

      expect(summary.success).toBe(true);
      expect(summary.variants_generated).toHaveLength(4);

      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);

      // Thumbnail: cover mode creates 150x150
      const thumbMeta = await sharp(putCalls[0].Body as Buffer).metadata();
      expect(thumbMeta.width).toBe(150);
      expect(thumbMeta.height).toBe(150);

      // Large: inside mode max 1200 width => 1200x6 (aspect ratio 200:1)
      const largeMeta = await sharp(putCalls[3].Body as Buffer).metadata();
      expect(largeMeta.format).toBe('webp');
      expect(largeMeta.width).toBe(1200);
      expect(largeMeta.height).toBe(6);
    });

    it('handles 50x10000 extreme vertical skyscraper strip without distortion or crash', async () => {
      const verticalStrip = await sharp({
        create: {
          width: 50,
          height: 10000,
          channels: 3,
          background: { r: 80, g: 40, b: 120 },
        },
      })
        .png()
        .toBuffer();

      const summary = await imageVariantService.generateVariantsForBuffer(
        verticalStrip,
        'pd-product-images',
        'theme/vertical_strip.png',
      );

      expect(summary.success).toBe(true);
      expect(summary.variants_generated).toHaveLength(4);

      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);

      // Large: inside mode max 1200 height => 6x1200
      const largeMeta = await sharp(putCalls[3].Body as Buffer).metadata();
      expect(largeMeta.format).toBe('webp');
      expect(largeMeta.width).toBe(6);
      expect(largeMeta.height).toBe(1200);
    });

    it('preserves alpha transparency channel when converting transparent PNG to WebP variants', async () => {
      // 200x200 PNG with 50% transparent alpha channel
      const transparentImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 255, g: 128, b: 0, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer();

      const summary = await imageVariantService.generateVariantsForBuffer(
        transparentImage,
        'pd-product-images',
        'products/transparent_badge.png',
      );

      expect(summary.success).toBe(true);
      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);

      const thumbMeta = await sharp(putCalls[0].Body as Buffer).metadata();
      expect(thumbMeta.format).toBe('webp');
      expect(thumbMeta.hasAlpha).toBe(true);
    });
  });

  describe('2. Dynamic Quality Settings & Boundary Clamping', () => {
    let testImageBuffer: Buffer;

    beforeEach(async () => {
      // Create noisy/textured image buffer to see distinct WebP quality file sizes
      const rawPixels = Buffer.alloc(400 * 400 * 3);
      for (let i = 0; i < rawPixels.length; i++) {
        rawPixels[i] = (i * 37 + (i % 256)) % 256;
      }
      testImageBuffer = await sharp(rawPixels, {
        raw: { width: 400, height: 400, channels: 3 },
      })
        .png()
        .toBuffer();
    });

    it('clamps quality < 30 up to 30 (e.g. quality 10)', async () => {
      vi.mocked(platformConfigService.getSettings).mockResolvedValue({
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
        image_quality_webp: 10,
      } as any);

      const summary = await imageVariantService.generateVariantsForBuffer(
        testImageBuffer,
        'pd-product-images',
        'products/test_low_q.png',
      );

      expect(summary.success).toBe(true);
      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);
      const lowQualityLargeBuffer = putCalls[3].Body as Buffer;

      // Verify asset metadata records clamped quality 30
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pd_file_asset'),
        expect.arrayContaining([
          expect.stringContaining('"webp_quality":30'),
          'products/test_low_q.png',
          'products/test_low_q',
          '%products/test_low_q%',
        ]),
      );
      expect(lowQualityLargeBuffer.length).toBeGreaterThan(0);
    });

    it('clamps quality > 100 down to 100 (e.g. quality 150)', async () => {
      vi.mocked(platformConfigService.getSettings).mockResolvedValue({
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
        image_quality_webp: 150,
      } as any);

      const summary = await imageVariantService.generateVariantsForBuffer(
        testImageBuffer,
        'pd-product-images',
        'products/test_high_q.png',
      );

      expect(summary.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pd_file_asset'),
        expect.arrayContaining([
          expect.stringContaining('"webp_quality":100'),
          'products/test_high_q.png',
          'products/test_high_q',
          '%products/test_high_q%',
        ]),
      );
    });

    it('handles negative quality values by clamping to 30', async () => {
      vi.mocked(platformConfigService.getSettings).mockResolvedValue({
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
        image_quality_webp: -50,
      } as any);

      const summary1 = await imageVariantService.generateVariantsForBuffer(
        testImageBuffer,
        'pd-product-images',
        'products/test_neg.png',
      );
      expect(summary1.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pd_file_asset'),
        expect.arrayContaining([expect.stringContaining('"webp_quality":30'), 'products/test_neg.png', 'products/test_neg', '%products/test_neg%']),
      );
    });

    it('documents quality 0 fallback to 82 due to JavaScript falsy operator (0 || 82)', async () => {
      vi.mocked(platformConfigService.getSettings).mockResolvedValue({
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
        image_quality_webp: 0,
      } as any);

      const summary = await imageVariantService.generateVariantsForBuffer(
        testImageBuffer,
        'pd-product-images',
        'products/test_zero.png',
      );
      expect(summary.success).toBe(true);
      // Because 0 is falsy, (0 || 82) resolves to 82
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pd_file_asset'),
        expect.arrayContaining([expect.stringContaining('"webp_quality":82'), 'products/test_zero.png', 'products/test_zero', '%products/test_zero%']),
      );
    });

    it('produces significantly smaller file size at quality 30 than at quality 100', async () => {
      // 1. Generate at quality 30
      vi.mocked(platformConfigService.getSettings).mockResolvedValue({
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
        image_quality_webp: 30,
      } as any);
      await imageVariantService.generateVariantsForBuffer(testImageBuffer, 'pd-product-images', 'products/q30.png');
      const q30Calls = mockS3Send.mock.calls.map((c) => c[0].input);
      const q30Size = (q30Calls[3].Body as Buffer).length;

      mockS3Send.mockClear();

      // 2. Generate at quality 100
      vi.mocked(platformConfigService.getSettings).mockResolvedValue({
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
        image_quality_webp: 100,
      } as any);
      await imageVariantService.generateVariantsForBuffer(testImageBuffer, 'pd-product-images', 'products/q100.png');
      const q100Calls = mockS3Send.mock.calls.map((c) => c[0].input);
      const q100Size = (q100Calls[3].Body as Buffer).length;

      expect(q30Size).toBeLessThan(q100Size);
    });

    it('enforces dimension preset clamping from platform settings', async () => {
      vi.mocked(platformConfigService.getSettings).mockResolvedValueOnce({
        image_size_thumbnail_w: 5, // Below min 20 => clamped to 20
        image_size_thumbnail_h: 5000, // Above max 2000 => clamped to 2000
        image_size_thumbnail_crop: 'cover',
        image_size_small_w: 10, // Below min 50 => clamped to 50
        image_size_small_h: 5000, // Above max 2000 => clamped to 2000
        image_size_small_crop: 'inside',
        image_size_medium_w: 50, // Below min 100 => clamped to 100
        image_size_medium_h: 5000, // Above max 3000 => clamped to 3000
        image_size_medium_crop: 'inside',
        image_size_large_w: 100, // Below min 200 => clamped to 200
        image_size_large_h: 10000, // Above max 4000 => clamped to 4000
        image_size_large_crop: 'inside',
      } as any);

      const configs = await imageVariantService.getPresetConfigs();

      expect(configs.thumbnail.width).toBe(20);
      expect(configs.thumbnail.height).toBe(2000);
      expect(configs.small.width).toBe(50);
      expect(configs.small.height).toBe(2000);
      expect(configs.medium.width).toBe(100);
      expect(configs.medium.height).toBe(3000);
      expect(configs.large.width).toBe(200);
      expect(configs.large.height).toBe(4000);
    });
  });

  describe('3. Corruption, Truncated & Invalid Buffers', () => {
    it('gracefully fails on random non-image binary buffer without throwing', async () => {
      const corruptBuffer = Buffer.from('THIS IS NOT A VALID IMAGE BUFFER AT ALL');

      const summary = await imageVariantService.generateVariantsForBuffer(
        corruptBuffer,
        'pd-product-images',
        'products/corrupt.jpg',
      );

      expect(summary.success).toBe(false);
      expect(summary.variants_generated).toHaveLength(0);
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('gracefully fails on truncated image header', async () => {
      // Valid PNG header (8 bytes) followed by garbage
      const truncatedBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

      const summary = await imageVariantService.generateVariantsForBuffer(
        truncatedBuffer,
        'pd-product-images',
        'products/truncated.png',
      );

      expect(summary.success).toBe(false);
      expect(summary.variants_generated).toHaveLength(0);
    });

    it('gracefully fails on empty buffer Buffer.alloc(0)', async () => {
      const summary = await imageVariantService.generateVariantsForBuffer(
        Buffer.alloc(0),
        'pd-product-images',
        'products/empty.png',
      );

      expect(summary.success).toBe(false);
      expect(summary.variants_generated).toHaveLength(0);
    });

    it('gracefully fails when null or undefined buffer is passed', async () => {
      const summary1 = await imageVariantService.generateVariantsForBuffer(
        null as any,
        'pd-product-images',
        'products/null.png',
      );
      expect(summary1.success).toBe(false);

      const summary2 = await imageVariantService.generateVariantsForBuffer(
        undefined as any,
        'pd-product-images',
        'products/undefined.png',
      );
      expect(summary2.success).toBe(false);
    });
  });

  describe('4. Suffix Parsing & Variant Key Generation', () => {
    it('handles deeply nested paths with special characters', () => {
      const parsed = imageVariantService.getBaseKeyAndExtension(
        'products/store_123/sub-category/autumn-2026/item-01.png',
      );
      expect(parsed.baseKeyWithoutExt).toBe('products/store_123/sub-category/autumn-2026/item-01');
      expect(parsed.ext).toBe('png');
      expect(parsed.preset).toBeUndefined();
    });

    it('handles filenames containing multiple dots', () => {
      const parsed = imageVariantService.getBaseKeyAndExtension(
        'theme/banner.v2.preview.final.jpeg',
      );
      expect(parsed.baseKeyWithoutExt).toBe('theme/banner.v2.preview.final');
      expect(parsed.ext).toBe('jpeg');
      expect(parsed.preset).toBeUndefined();
    });

    it('handles files with preset words inside the name that are NOT suffixes', () => {
      const parsed = imageVariantService.getBaseKeyAndExtension(
        'products/store_1/small_and_large_boxes_thumbnail_item.png',
      );
      expect(parsed.baseKeyWithoutExt).toBe('products/store_1/small_and_large_boxes_thumbnail_item');
      expect(parsed.preset).toBeUndefined();
    });

    it('correctly strips preset suffixes from variant keys of all 4 presets', () => {
      const presets = ['thumbnail', 'small', 'medium', 'large'] as const;
      for (const preset of presets) {
        const key = `products/store_1/hoodie_${preset}.webp`;
        const parsed = imageVariantService.getBaseKeyAndExtension(key);
        expect(parsed.baseKeyWithoutExt).toBe('products/store_1/hoodie');
        expect(parsed.preset).toBe(preset);
        expect(parsed.ext).toBe('webp');

        const newKey = imageVariantService.getVariantKey(parsed.baseKeyWithoutExt, preset);
        expect(newKey).toBe(`products/store_1/hoodie_${preset}.webp`);
      }
    });

    it('strips leading slashes and all recognized bucket prefixes', () => {
      const keysWithBuckets = [
        'pd-product-images/products/store_1/item.jpg',
        'pandamarket/products/store_1/item.jpg',
        'pd-private-files/documents/receipt.pdf',
        'pd-themes/theme_1/hero.webp',
        '///products/store_1/item.jpg',
      ];

      expect(imageVariantService.getBaseKeyAndExtension(keysWithBuckets[0]).baseKeyWithoutExt).toBe(
        'products/store_1/item',
      );
      expect(imageVariantService.getBaseKeyAndExtension(keysWithBuckets[1]).baseKeyWithoutExt).toBe(
        'products/store_1/item',
      );
      expect(imageVariantService.getBaseKeyAndExtension(keysWithBuckets[2]).baseKeyWithoutExt).toBe(
        'documents/receipt',
      );
      expect(imageVariantService.getBaseKeyAndExtension(keysWithBuckets[3]).baseKeyWithoutExt).toBe(
        'theme_1/hero',
      );
      expect(imageVariantService.getBaseKeyAndExtension(keysWithBuckets[4]).baseKeyWithoutExt).toBe(
        'products/store_1/item',
      );
    });

    it('handles files with no extension', () => {
      const parsed = imageVariantService.getBaseKeyAndExtension('products/store_1/rawfile');
      expect(parsed.baseKeyWithoutExt).toBe('products/store_1/rawfile');
      expect(parsed.ext).toBe('webp');
    });
  });

  describe('5. Cloudflare R2 / StorageService & S3 Upload Logic', () => {
    it('StorageService uploads WebP variant buffer with required immutable cache headers and CDN URL', async () => {
      const storage = new StorageService({
        r2AccountId: 'test-acc',
        r2AccessKeyId: 'test-key',
        r2SecretAccessKey: 'test-secret',
        r2Bucket: 'pandamarket',
        cdnBaseUrl: 'https://cdn.garbage.team',
      });

      expect(storage.isConfigured()).toBe(true);

      const fakeBuffer = Buffer.from('fake-webp-content');
      const result = await storage.uploadBuffer(
        'products/store_1/sample_medium.webp',
        fakeBuffer,
        'image/webp',
      );

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://cdn.garbage.team/products/store_1/sample_medium.webp');
      expect(result.key).toBe('products/store_1/sample_medium.webp');

      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'pandamarket',
            Key: 'products/store_1/sample_medium.webp',
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        }),
      );
    });

    it('StorageService strips bucket prefixes from upload keys and URLs', async () => {
      const storage = new StorageService({
        r2AccountId: 'test-acc',
        r2AccessKeyId: 'test-key',
        r2SecretAccessKey: 'test-secret',
        r2Bucket: 'pandamarket',
        cdnBaseUrl: 'https://cdn.garbage.team',
      });

      const fakeBuffer = Buffer.from('fake-webp-content');
      const result = await storage.uploadBuffer(
        'pd-product-images/products/store_2/shoe_large.webp',
        fakeBuffer,
        'image/webp',
      );

      expect(result.url).toBe('https://cdn.garbage.team/products/store_2/shoe_large.webp');
      expect(result.key).toBe('products/store_2/shoe_large.webp');
    });

    it('handles S3 upload network failure gracefully without interrupting DB/local storage', async () => {
      const validImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      // S3 rejects with network error
      mockS3Send.mockRejectedValue(new Error('S3 connection timeout'));

      const summary = await imageVariantService.generateVariantsForBuffer(
        validImage,
        'pd-product-images',
        'products/store_1/resilient.png',
      );

      // Even if S3 fails, the pipeline logs warning and succeeds with DB persistence
      expect(summary.success).toBe(true);
      expect(summary.variants_generated).toHaveLength(4);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pd_file_blobs'),
        expect.anything(),
      );
    });
  });

  describe('6. Universal Key Generation & On-The-Fly Dynamic Fallback', () => {
    it('generateVariantsFromR2 handles missing key / S3 NoSuchKey error without throwing', async () => {
      mockS3Send.mockRejectedValueOnce(new Error('NoSuchKey'));

      const summary = await imageVariantService.generateVariantsFromR2(
        'pd-product-images',
        'products/store_1/missing.png',
      );

      expect(summary.success).toBe(false);
      expect(summary.variants_generated).toHaveLength(0);
    });

    it('getOrGenerateVariantOnTheFly returns null when given non-preset key or non-existent file', async () => {
      const result1 = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/store_1/original_image.png',
      );
      expect(result1).toBeNull();

      // Master not found anywhere in DB or R2
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockS3Send.mockRejectedValue(new Error('NoSuchKey'));

      const result2 = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/store_1/missing_small.webp',
      );
      expect(result2).toBeNull();
    });
  });
});
