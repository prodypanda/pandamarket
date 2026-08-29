/**
 * Service for generating, storing, and serving WordPress-style multi-size image variants.
 *
 * Supported size presets:
 * - thumbnail (default 150x150 cover crop)
 * - small (default 300x300 fit)
 * - medium (default 600x600 fit)
 * - large (default 1200x1200 fit)
 * - original (original resolution, optimized WebP/JPEG)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { query } from '../db/pool';
import { resolveDataPath } from '../utils/data-dir';
import { platformConfigService } from './platform-config.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import { getS3 } from '../utils/s3';

export type ImageSizePreset = 'thumbnail' | 'small' | 'medium' | 'large';

export interface ImagePresetConfig {
  preset: ImageSizePreset;
  width: number;
  height: number;
  crop: 'cover' | 'inside';
}

export interface GenerationSummary {
  success: boolean;
  base_key: string;
  variants_generated: string[];
}

export class ImageVariantService {
  /**
   * Get configured dimensions for all presets from platform settings.
   */
  async getPresetConfigs(): Promise<Record<ImageSizePreset, ImagePresetConfig>> {
    const settings = await platformConfigService.getSettings();

    return {
      thumbnail: {
        preset: 'thumbnail',
        width: Math.max(20, Math.min(2000, Number(settings.image_size_thumbnail_w || 150))),
        height: Math.max(20, Math.min(2000, Number(settings.image_size_thumbnail_h || 150))),
        crop: (settings.image_size_thumbnail_crop as 'cover' | 'inside') || 'cover',
      },
      small: {
        preset: 'small',
        width: Math.max(50, Math.min(2000, Number(settings.image_size_small_w || 300))),
        height: Math.max(50, Math.min(2000, Number(settings.image_size_small_h || 300))),
        crop: (settings.image_size_small_crop as 'cover' | 'inside') || 'inside',
      },
      medium: {
        preset: 'medium',
        width: Math.max(100, Math.min(3000, Number(settings.image_size_medium_w || 600))),
        height: Math.max(100, Math.min(3000, Number(settings.image_size_medium_h || 600))),
        crop: (settings.image_size_medium_crop as 'cover' | 'inside') || 'inside',
      },
      large: {
        preset: 'large',
        width: Math.max(200, Math.min(4000, Number(settings.image_size_large_w || 1200))),
        height: Math.max(200, Math.min(4000, Number(settings.image_size_large_h || 1200))),
        crop: (settings.image_size_large_crop as 'cover' | 'inside') || 'inside',
      },
    };
  }

  /**
   * Strip any existing preset suffix (_thumbnail, _small, _medium, _large) to find the original key.
   */
  getBaseKeyAndExtension(rawKey: string): { baseKeyWithoutExt: string; ext: string; preset?: ImageSizePreset } {
    const cleanKey = rawKey.replace(/^\/+/, '');
    const lastDotIndex = cleanKey.lastIndexOf('.');
    let base = lastDotIndex > -1 ? cleanKey.substring(0, lastDotIndex) : cleanKey;
    const ext = lastDotIndex > -1 ? cleanKey.substring(lastDotIndex + 1) : 'webp';

    const presets: ImageSizePreset[] = ['thumbnail', 'small', 'medium', 'large'];
    let detectedPreset: ImageSizePreset | undefined;

    for (const preset of presets) {
      if (base.endsWith(`_${preset}`)) {
        detectedPreset = preset;
        base = base.substring(0, base.length - (`_${preset}`).length);
        break;
      }
    }

    return { baseKeyWithoutExt: base, ext, preset: detectedPreset };
  }

  /**
   * Build variant key for a given preset.
   * e.g. base: 'products/store1/shoe', preset: 'small' -> 'products/store1/shoe_small.webp'
   */
  getVariantKey(baseKeyWithoutExt: string, preset: ImageSizePreset): string {
    return `${baseKeyWithoutExt}_${preset}.webp`;
  }

  /**
   * Generate all multi-size image variants for an uploaded image buffer.
   */
  async generateVariantsForBuffer(
    buffer: Buffer,
    bucket: string,
    rawKey: string,
  ): Promise<GenerationSummary> {
    if (!buffer || buffer.length === 0) {
      return { success: false, base_key: rawKey, variants_generated: [] };
    }

    const { baseKeyWithoutExt } = this.getBaseKeyAndExtension(rawKey);
    const presetConfigs = await this.getPresetConfigs();
    const settings = await platformConfigService.getSettings();
    const quality = Math.max(30, Math.min(100, Number(settings.image_quality_webp || 82)));

    const variantsGenerated: string[] = [];

    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata || !metadata.width || !metadata.height) {
        return { success: false, base_key: rawKey, variants_generated: [] };
      }

      for (const preset of ['thumbnail', 'small', 'medium', 'large'] as ImageSizePreset[]) {
        const presetConf = presetConfigs[preset];
        const variantKey = this.getVariantKey(baseKeyWithoutExt, preset);
        const blobKey = `${bucket}/${variantKey}`;

        let pipeline = sharp(buffer);

        if (presetConf.crop === 'cover') {
          pipeline = pipeline.resize({
            width: presetConf.width,
            height: presetConf.height,
            fit: 'cover',
            position: 'center',
          });
        } else {
          pipeline = pipeline.resize({
            width: presetConf.width,
            height: presetConf.height,
            fit: 'inside',
            withoutEnlargement: true,
          });
        }

        const variantBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();

        // 1. Write to local disk
        try {
          const filePath = resolveDataPath(bucket, variantKey);
          await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
          await fs.promises.writeFile(filePath, variantBuffer);
        } catch (diskErr) {
          logger.warn({ err: diskErr, variantKey }, 'Failed writing image variant to disk');
        }

        // 2. Persist in database pd_file_blobs
        try {
          await query(
            `INSERT INTO pd_file_blobs (key, bucket, content_type, data)
             VALUES ($1, $2, 'image/webp', $3)
             ON CONFLICT (key) DO UPDATE SET
               content_type = EXCLUDED.content_type,
               data = EXCLUDED.data,
               created_at = NOW()`,
            [blobKey, bucket, variantBuffer],
          );
          variantsGenerated.push(variantKey);
        } catch (dbErr) {
          logger.error({ err: dbErr, blobKey }, 'Failed persisting image variant to DB');
        }

        // 3. Upload variant directly to Cloudflare R2 / S3 storage
        const isR2 = Boolean(config.storage.r2AccountId && config.storage.r2AccessKeyId);
        const targetBucket = isR2 ? (config.storage.r2Bucket || 'pandamarket') : bucket;
        try {
          const s3 = getS3();
          await s3.send(
            new PutObjectCommand({
              Bucket: targetBucket,
              Key: variantKey,
              ContentType: 'image/webp',
              Body: variantBuffer,
              CacheControl: 'public, max-age=31536000, immutable',
            }),
          );
        } catch (s3Err) {
          logger.warn({ err: s3Err, variantKey, targetBucket }, 'Failed uploading image variant to S3/R2');
        }
      }

      logger.info(
        { baseKey: rawKey, count: variantsGenerated.length },
        'Generated image size variants',
      );
      return { success: true, base_key: rawKey, variants_generated: variantsGenerated };
    } catch (err) {
      logger.error({ err, rawKey }, 'Error generating image variants');
      return { success: false, base_key: rawKey, variants_generated: [] };
    }
  }

  /**
   * Fetches master original image from R2/S3 storage and generates all 4 WebP variants.
   */
  async generateVariantsFromR2(bucket: string, fileKey: string): Promise<GenerationSummary> {
    const isR2 = Boolean(config.storage.r2AccountId && config.storage.r2AccessKeyId);
    const targetBucket = isR2 ? (config.storage.r2Bucket || 'pandamarket') : bucket;
    const cleanKey = fileKey.replace(/^\/+/, '');

    try {
      const s3 = getS3();
      const getRes = await s3.send(
        new GetObjectCommand({
          Bucket: targetBucket,
          Key: cleanKey,
        }),
      );

      if (!getRes.Body) {
        logger.warn({ targetBucket, cleanKey }, 'No body returned when fetching master image from S3/R2');
        return { success: false, base_key: cleanKey, variants_generated: [] };
      }

      const bytes = await getRes.Body.transformToByteArray();
      const buffer = Buffer.from(bytes);
      return await this.generateVariantsForBuffer(buffer, bucket, cleanKey);
    } catch (err) {
      logger.error({ err, targetBucket, cleanKey }, 'Failed to fetch and generate variants from S3/R2');
      return { success: false, base_key: cleanKey, variants_generated: [] };
    }
  }

  /**
   * Universal variant generation helper for a given file key.
   * Checks Cloudflare R2, DB blobs, and disk to find original and generate variants.
   */
  async generateVariantsForFileKey(rawKey: string, bucket: string = 'pd-product-images'): Promise<GenerationSummary> {
    const cleanKey = rawKey.replace(/^\/+/, '').replace(/^pd-product-images\//, '');
    const isR2 = Boolean(config.storage.r2AccountId && config.storage.r2AccessKeyId);

    // 1. If R2 is active, try fetching directly from R2
    if (isR2) {
      const r2Summary = await this.generateVariantsFromR2(bucket, cleanKey);
      if (r2Summary.success && r2Summary.variants_generated.length > 0) {
        return r2Summary;
      }
    }

    // 2. Check PostgreSQL pd_file_blobs
    const { rows } = await query<{ data: Buffer; bucket: string }>(
      `SELECT data, bucket FROM pd_file_blobs WHERE key = $1 OR key = $2 ORDER BY created_at DESC LIMIT 1`,
      [cleanKey, `${bucket}/${cleanKey}`],
    );

    if (rows.length > 0 && rows[0].data) {
      return await this.generateVariantsForBuffer(rows[0].data, rows[0].bucket || bucket, cleanKey);
    }

    // 3. Check local disk
    try {
      const filePath = resolveDataPath(bucket, cleanKey);
      if (fs.existsSync(filePath)) {
        const diskBuffer = await fs.promises.readFile(filePath);
        return await this.generateVariantsForBuffer(diskBuffer, bucket, cleanKey);
      }
    } catch {
      // Local disk fallback ignored
    }

    return { success: false, base_key: cleanKey, variants_generated: [] };
  }

  /**
   * On-the-fly variant generator fallback when a requested variant key does not exist yet.
   */
  async getOrGenerateVariantOnTheFly(
    bucket: string,
    requestedKey: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const { baseKeyWithoutExt, preset } = this.getBaseKeyAndExtension(requestedKey);

    if (!preset) {
      return null;
    }

    let cleanBase = baseKeyWithoutExt;
    if (cleanBase.startsWith(`${bucket}/`)) {
      cleanBase = cleanBase.substring(bucket.length + 1);
    }

    // Try finding the original file blob in database under common original extensions
    const candidateKeys = [
      `${bucket}/${cleanBase}.jpg`,
      `${bucket}/${cleanBase}.jpeg`,
      `${bucket}/${cleanBase}.png`,
      `${bucket}/${cleanBase}.webp`,
      `${bucket}/${cleanBase}.gif`,
      `${cleanBase}.jpg`,
      `${cleanBase}.jpeg`,
      `${cleanBase}.png`,
      `${cleanBase}.webp`,
      `${cleanBase}.gif`,
    ];

    const { rows } = await query<{ data: Buffer }>(
      `SELECT data FROM pd_file_blobs
       WHERE key = ANY($1::text[])
       ORDER BY created_at DESC LIMIT 1`,
      [candidateKeys],
    );

    let originalBuffer: Buffer | null = null;

    if (rows.length > 0 && rows[0].data) {
      originalBuffer = rows[0].data;
    } else {
      // Try finding original master in Cloudflare R2 / S3
      const isR2 = Boolean(config.storage.r2AccountId && config.storage.r2AccessKeyId);
      const targetBucket = isR2 ? (config.storage.r2Bucket || 'pandamarket') : bucket;
      const s3 = getS3();

      for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'gif']) {
        try {
          const r2Key = `${cleanBase}.${ext}`;
          const getRes = await s3.send(
            new GetObjectCommand({
              Bucket: targetBucket,
              Key: r2Key,
            }),
          );
          if (getRes.Body) {
            const bytes = await getRes.Body.transformToByteArray();
            originalBuffer = Buffer.from(bytes);
            break;
          }
        } catch {
          // Continue trying other candidate extensions
        }
      }
    }

    if (!originalBuffer || originalBuffer.length === 0) {
      return null;
    }

    let cleanRequestedKey = requestedKey;
    if (cleanRequestedKey.startsWith(`${bucket}/`)) {
      cleanRequestedKey = cleanRequestedKey.substring(bucket.length + 1);
    }

    const summary = await this.generateVariantsForBuffer(originalBuffer, bucket, cleanRequestedKey);

    if (!summary.success) {
      return null;
    }

    // Return the generated variant blob from DB
    const variantBlobKey = `${bucket}/${cleanRequestedKey}`;
    const { rows: variantRows } = await query<{ data: Buffer; content_type: string }>(
      `SELECT data, content_type FROM pd_file_blobs WHERE key = $1 OR key = $2 LIMIT 1`,
      [variantBlobKey, cleanRequestedKey],
    );

    if (variantRows.length > 0) {
      return { buffer: variantRows[0].data, contentType: variantRows[0].content_type || 'image/webp' };
    }

    return null;
  }

  /**
   * Bulk regeneration of all image variants across the database.
   */
  async regenerateAllVariants(): Promise<{
    total_originals: number;
    processed: number;
    variants_generated: number;
    errors: number;
  }> {
    const { rows } = await query<{ key: string; bucket: string; data: Buffer }>(
      `SELECT key, bucket, data FROM pd_file_blobs
       WHERE content_type LIKE 'image/%'
         AND key NOT LIKE '%_thumbnail.webp'
         AND key NOT LIKE '%_small.webp'
         AND key NOT LIKE '%_medium.webp'
         AND key NOT LIKE '%_large.webp'
       ORDER BY created_at DESC`,
    );

    let processed = 0;
    let variantsGenerated = 0;
    let errors = 0;

    for (const row of rows) {
      if (!row.data || row.data.length === 0) continue;

      let cleanKey = row.key;
      const bucket = row.bucket || 'pd-product-images';

      if (cleanKey.startsWith(`${bucket}/`)) {
        cleanKey = cleanKey.substring(bucket.length + 1);
      }

      try {
        const summary = await this.generateVariantsForBuffer(row.data, bucket, cleanKey);
        if (summary.success) {
          processed++;
          variantsGenerated += summary.variants_generated.length;
        } else {
          errors++;
        }
      } catch (err) {
        errors++;
        logger.error({ err, key: row.key }, 'Failed regenerating image variants during bulk job');
      }
    }

    return {
      total_originals: rows.length,
      processed,
      variants_generated: variantsGenerated,
      errors,
    };
  }
}

export const imageVariantService = new ImageVariantService();
