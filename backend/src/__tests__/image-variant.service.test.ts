import { describe, it, expect, vi, beforeEach } from 'vitest';
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
      image_quality_webp: 85,
    }),
  },
}));

import { imageVariantService, ImageVariantService } from '../services/image-variant.service';
import { platformConfigService } from '../services/platform-config.service';

describe('Milestone 1: ImageVariantService Multi-Size WebP Variant Generation & Cloudflare R2 Sync', () => {
  let sampleImageBuffer: Buffer;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockS3Send.mockResolvedValue({});
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    // Create valid 200x200 sample image buffer using sharp
    sampleImageBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  describe('1. Preset Configs & Parsing', () => {
    it('retrieves preset configs with correct defaults and constraints', async () => {
      const configs = await imageVariantService.getPresetConfigs();

      expect(configs.thumbnail).toEqual({
        preset: 'thumbnail',
        width: 150,
        height: 150,
        crop: 'cover',
      });
      expect(configs.small).toEqual({
        preset: 'small',
        width: 300,
        height: 300,
        crop: 'inside',
      });
      expect(configs.medium).toEqual({
        preset: 'medium',
        width: 600,
        height: 600,
        crop: 'inside',
      });
      expect(configs.large).toEqual({
        preset: 'large',
        width: 1200,
        height: 1200,
        crop: 'inside',
      });
    });

    it('adapts dynamically to platform setting overrides', async () => {
      vi.mocked(platformConfigService.getSettings).mockResolvedValueOnce({
        image_size_thumbnail_w: 160,
        image_size_thumbnail_h: 160,
        image_size_thumbnail_crop: 'inside',
        image_size_small_w: 320,
        image_size_small_h: 320,
        image_size_small_crop: 'cover',
        image_size_medium_w: 640,
        image_size_medium_h: 640,
        image_size_medium_crop: 'inside',
        image_size_large_w: 1280,
        image_size_large_h: 1280,
        image_size_large_crop: 'inside',
        image_quality_webp: 90,
      } as any);

      const configs = await imageVariantService.getPresetConfigs();
      expect(configs.thumbnail.width).toBe(160);
      expect(configs.thumbnail.crop).toBe('inside');
      expect(configs.small.width).toBe(320);
      expect(configs.small.crop).toBe('cover');
      expect(configs.medium.width).toBe(640);
      expect(configs.large.width).toBe(1280);
    });

    it('getBaseKeyAndExtension parses clean keys, bucket prefixes, and existing preset suffixes', () => {
      const parsed1 = imageVariantService.getBaseKeyAndExtension('products/store_1/vase.png');
      expect(parsed1.baseKeyWithoutExt).toBe('products/store_1/vase');
      expect(parsed1.ext).toBe('png');
      expect(parsed1.preset).toBeUndefined();

      const parsed2 = imageVariantService.getBaseKeyAndExtension('pd-product-images/products/store_1/vase_small.webp');
      expect(parsed2.baseKeyWithoutExt).toBe('products/store_1/vase');
      expect(parsed2.ext).toBe('webp');
      expect(parsed2.preset).toBe('small');

      const parsed3 = imageVariantService.getBaseKeyAndExtension('/products/store_1/vase_large.webp');
      expect(parsed3.baseKeyWithoutExt).toBe('products/store_1/vase');
      expect(parsed3.ext).toBe('webp');
      expect(parsed3.preset).toBe('large');
    });

    it('getVariantKey formats key pattern correctly', () => {
      expect(imageVariantService.getVariantKey('products/store_1/vase', 'thumbnail')).toBe(
        'products/store_1/vase_thumbnail.webp',
      );
      expect(imageVariantService.getVariantKey('products/store_1/vase', 'small')).toBe(
        'products/store_1/vase_small.webp',
      );
      expect(imageVariantService.getVariantKey('products/store_1/vase', 'medium')).toBe(
        'products/store_1/vase_medium.webp',
      );
      expect(imageVariantService.getVariantKey('products/store_1/vase', 'large')).toBe(
        'products/store_1/vase_large.webp',
      );
    });
  });

  describe('2. Multi-Size WebP Variant Generation & Cloudflare R2 Upload', () => {
    it('generates all 4 WebP variants, uploads to R2 with immutable cache-control, persists to DB and updates asset metadata', async () => {
      const summary = await imageVariantService.generateVariantsForBuffer(
        sampleImageBuffer,
        'pd-product-images',
        'products/store_1/sample.png',
      );

      expect(summary.success).toBe(true);
      expect(summary.variants_generated).toEqual([
        'products/store_1/sample_thumbnail.webp',
        'products/store_1/sample_small.webp',
        'products/store_1/sample_medium.webp',
        'products/store_1/sample_large.webp',
      ]);

      // Verify S3 PutObjectCommand was called 4 times for all presets
      expect(mockS3Send).toHaveBeenCalledTimes(4);

      // Verify PutObjectCommand arguments
      const putCalls = mockS3Send.mock.calls.map((call) => call[0].input);
      expect(putCalls[0]).toEqual(
        expect.objectContaining({
          Key: 'products/store_1/sample_thumbnail.webp',
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      expect(putCalls[1]).toEqual(
        expect.objectContaining({
          Key: 'products/store_1/sample_small.webp',
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      expect(putCalls[2]).toEqual(
        expect.objectContaining({
          Key: 'products/store_1/sample_medium.webp',
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      expect(putCalls[3]).toEqual(
        expect.objectContaining({
          Key: 'products/store_1/sample_large.webp',
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      // Verify PostgreSQL pd_file_blobs insertions
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pd_file_blobs'),
        expect.arrayContaining(['pd-product-images/products/store_1/sample_thumbnail.webp', 'pd-product-images']),
      );

      // Verify pd_file_asset metadata update
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pd_file_asset'),
        expect.arrayContaining([
          expect.stringContaining('"thumbnail"'),
          'products/store_1/sample.png',
          'products/store_1/sample',
          '%products/store_1/sample%',
        ]),
      );
    });

    it('returns failure when given empty or invalid buffer', async () => {
      const summary = await imageVariantService.generateVariantsForBuffer(
        Buffer.alloc(0),
        'pd-product-images',
        'invalid.png',
      );
      expect(summary.success).toBe(false);
      expect(summary.variants_generated).toHaveLength(0);
    });
  });

  describe('3. R2 & Universal Key Generation', () => {
    it('generateVariantsFromR2 fetches original from R2 and generates all variants', async () => {
      mockS3Send.mockResolvedValueOnce({
        Body: {
          transformToByteArray: async () => sampleImageBuffer,
        },
      });

      const summary = await imageVariantService.generateVariantsFromR2(
        'pd-product-images',
        'products/store_1/r2_master.jpg',
      );

      expect(summary.success).toBe(true);
      expect(summary.variants_generated.length).toBe(4);
      expect(summary.variants_generated).toContain('products/store_1/r2_master_thumbnail.webp');
    });

    it('generateVariantsForFileKey falls back to pd_file_blobs if R2 get fails or returns empty', async () => {
      // 1. Mock DB returning original blob
      mockQuery.mockResolvedValueOnce({
        rows: [{ data: sampleImageBuffer, bucket: 'pd-product-images' }],
      });

      const summary = await imageVariantService.generateVariantsForFileKey(
        'products/store_1/db_master.jpg',
        'pd-product-images',
      );

      expect(summary.success).toBe(true);
      expect(summary.variants_generated.length).toBe(4);
    });
  });

  describe('4. Dynamic On-The-Fly Generation Fallback', () => {
    it('getOrGenerateVariantOnTheFly generates and returns requested variant when not pre-generated', async () => {
      // 1. First query: lookup master blob
      mockQuery.mockResolvedValueOnce({
        rows: [{ data: sampleImageBuffer }],
      });
      // 2. Subsequent queries during generateVariantsForBuffer
      mockQuery.mockResolvedValue({
        rows: [{ data: sampleImageBuffer, content_type: 'image/webp' }],
      });

      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/store_1/sample_small.webp',
      );

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      expect(result?.buffer).toBeDefined();
    });

    it('getOrGenerateVariantOnTheFly returns null if requested key is not a variant preset', async () => {
      const result = await imageVariantService.getOrGenerateVariantOnTheFly(
        'pd-product-images',
        'products/store_1/sample.png',
      );
      expect(result).toBeNull();
    });
  });
});
