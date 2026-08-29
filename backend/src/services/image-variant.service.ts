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

/**
 * Safely parse integer values from dynamic platform configuration.
 * Handles null, undefined, empty string, non-numeric strings, and NaN gracefully with fallbacks and boundary clamping.
 */
export function parseSafeInt(val: unknown, fallback: number, min: number, max: number): number {
  if (val === null || val === undefined || val === '' || val === 0) return fallback;
  const num = Number(val);
  if (!Number.isFinite(num) || num === 0) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
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
        width: parseSafeInt(settings.image_size_thumbnail_w, 150, 20, 2000),
        height: parseSafeInt(settings.image_size_thumbnail_h, 150, 20, 2000),
        crop: (settings.image_size_thumbnail_crop as 'cover' | 'inside') || 'cover',
      },
      small: {
        preset: 'small',
        width: parseSafeInt(settings.image_size_small_w, 300, 50, 2000),
        height: parseSafeInt(settings.image_size_small_h, 300, 50, 2000),
        crop: (settings.image_size_small_crop as 'cover' | 'inside') || 'inside',
      },
      medium: {
        preset: 'medium',
        width: parseSafeInt(settings.image_size_medium_w, 600, 100, 3000),
        height: parseSafeInt(settings.image_size_medium_h, 600, 100, 3000),
        crop: (settings.image_size_medium_crop as 'cover' | 'inside') || 'inside',
      },
      large: {
        preset: 'large',
        width: parseSafeInt(settings.image_size_large_w, 1200, 200, 4000),
        height: parseSafeInt(settings.image_size_large_h, 1200, 200, 4000),
        crop: (settings.image_size_large_crop as 'cover' | 'inside') || 'inside',
      },
    };
  }

  /**
   * Strip any existing preset suffix (_thumbnail, _small, _medium, _large) to find the original key.
   */
  getBaseKeyAndExtension(rawKey: string, bucket?: string): { baseKeyWithoutExt: string; ext: string; preset?: ImageSizePreset } {
    let cleanKey = rawKey.replace(/^\/+/, '');
    if (bucket && cleanKey.startsWith(`${bucket}/`)) {
      cleanKey = cleanKey.substring(bucket.length + 1);
    }
    cleanKey = cleanKey.replace(/^(pd-product-images|pd-private-files|pd-themes|pandamarket)\//, '');

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

    const { baseKeyWithoutExt } = this.getBaseKeyAndExtension(rawKey, bucket);
    const presetConfigs = await this.getPresetConfigs();
    const settings = await platformConfigService.getSettings();
    const quality = parseSafeInt(settings.image_quality_webp, 82, 30, 100);

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

        // 1. Write to local disk cache
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
          if (blobKey !== variantKey) {
            await query(
              `INSERT INTO pd_file_blobs (key, bucket, content_type, data)
               VALUES ($1, $2, 'image/webp', $3)
               ON CONFLICT (key) DO UPDATE SET
                 content_type = EXCLUDED.content_type,
                 data = EXCLUDED.data,
                 created_at = NOW()`,
              [variantKey, bucket, variantBuffer],
            );
          }
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

      // 4. Update pd_file_asset metadata with WebP variant URLs and dimensions
      try {
        const cdnBase = (process.env.PD_CDN_BASE_URL || config.storage.cdnBaseUrl || 'https://cdn.garbage.team').replace(/\/+$/, '');
        const variantMap = {
          thumbnail: `${cdnBase}/${this.getVariantKey(baseKeyWithoutExt, 'thumbnail')}`,
          small: `${cdnBase}/${this.getVariantKey(baseKeyWithoutExt, 'small')}`,
          medium: `${cdnBase}/${this.getVariantKey(baseKeyWithoutExt, 'medium')}`,
          large: `${cdnBase}/${this.getVariantKey(baseKeyWithoutExt, 'large')}`,
        };
        const metadataUpdate = {
          variants: variantMap,
          webp_quality: quality,
          original_dimensions: { width: metadata.width, height: metadata.height },
          variants_generated_at: new Date().toISOString(),
        };

        await query(
          `UPDATE pd_file_asset
           SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
               updated_at = NOW()
           WHERE file_key = $2 OR file_key = $3 OR file_key LIKE $4 OR url LIKE $4`,
          [
            JSON.stringify(metadataUpdate),
            rawKey,
            baseKeyWithoutExt,
            `%${baseKeyWithoutExt}%`,
          ],
        );
      } catch (assetErr) {
        logger.warn({ err: assetErr, rawKey }, 'Failed updating pd_file_asset metadata with variants');
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

  public inFlightVariantGenerations = new Map<string, Promise<{ buffer: Buffer; contentType: string } | null>>();

  /**
   * Internal implementation of on-the-fly variant generator fallback.
   */
  private async doGetOrGenerateVariantOnTheFly(
    bucket: string,
    requestedKey: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const { baseKeyWithoutExt, preset } = this.getBaseKeyAndExtension(requestedKey, bucket);

    if (!preset) {
      return null;
    }

    let cleanRequestedKey = requestedKey.replace(/^\/+/, '');
    if (bucket && cleanRequestedKey.startsWith(`${bucket}/`)) {
      cleanRequestedKey = cleanRequestedKey.substring(bucket.length + 1);
    }
    cleanRequestedKey = cleanRequestedKey.replace(/^(pd-product-images|pd-private-files|pd-themes|pandamarket)\//, '');

    // 1. Check if the requested variant already exists in pd_file_blobs
    const variantBlobKeys = [`${bucket}/${cleanRequestedKey}`, cleanRequestedKey];
    const { rows: existingBlobRows } = await query<{ data: Buffer; content_type: string }>(
      `SELECT data, content_type FROM pd_file_blobs WHERE key = ANY($1::text[]) ORDER BY created_at DESC LIMIT 1`,
      [variantBlobKeys],
    );

    if (existingBlobRows.length > 0 && existingBlobRows[0].data && existingBlobRows[0].data.length > 0) {
      return { buffer: existingBlobRows[0].data, contentType: existingBlobRows[0].content_type || 'image/webp' };
    }

    // 2. Check if the requested variant already exists in Cloudflare R2 / S3
    const isR2 = Boolean(config.storage.r2AccountId && config.storage.r2AccessKeyId);
    const targetBucket = isR2 ? (config.storage.r2Bucket || 'pandamarket') : bucket;
    const s3 = getS3();

    if (isR2) {
      try {
        const getRes = await s3.send(
          new GetObjectCommand({
            Bucket: targetBucket,
            Key: cleanRequestedKey,
          }),
        );
        if (getRes.Body) {
          const bytes = await getRes.Body.transformToByteArray();
          const variantBuffer = Buffer.from(bytes);
          if (variantBuffer.length > 0) {
            // Cache to DB blobs in background
            try {
              await query(
                `INSERT INTO pd_file_blobs (key, bucket, content_type, data)
                 VALUES ($1, $2, 'image/webp', $3)
                 ON CONFLICT (key) DO UPDATE SET
                   content_type = EXCLUDED.content_type,
                   data = EXCLUDED.data,
                   created_at = NOW()`,
                [`${bucket}/${cleanRequestedKey}`, bucket, variantBuffer],
              );
            } catch {
              // Ignore background cache insertion error
            }
            return { buffer: variantBuffer, contentType: 'image/webp' };
          }
        }
      } catch {
        // Variant not found in R2 yet, proceed to find master original
      }
    }

    // 3. Find master original across candidate extensions (.jpg, .jpeg, .png, .webp, .gif, .jfif)
    let cleanBase = baseKeyWithoutExt.replace(/^\/+/, '');
    if (cleanBase.startsWith(`${bucket}/`)) {
      cleanBase = cleanBase.substring(bucket.length + 1);
    }
    cleanBase = cleanBase.replace(/^(pd-product-images|pd-private-files|pd-themes|pandamarket)\//, '');

    const candidateExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'jfif'];
    const candidateKeys: string[] = [];
    for (const ext of candidateExtensions) {
      candidateKeys.push(`${bucket}/${cleanBase}.${ext}`);
      candidateKeys.push(`${cleanBase}.${ext}`);
    }
    candidateKeys.push(`${bucket}/${cleanBase}`);
    candidateKeys.push(cleanBase);

    // 3a. Check PostgreSQL pd_file_blobs
    const { rows: masterBlobRows } = await query<{ data: Buffer }>(
      `SELECT data FROM pd_file_blobs
       WHERE key = ANY($1::text[])
       ORDER BY created_at DESC LIMIT 1`,
      [candidateKeys],
    );

    let originalBuffer: Buffer | null = null;

    if (masterBlobRows.length > 0 && masterBlobRows[0].data && masterBlobRows[0].data.length > 0) {
      originalBuffer = masterBlobRows[0].data;
    } else {
      // 3b. Try finding original master in Cloudflare R2 / S3
      for (const ext of candidateExtensions) {
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
            const buf = Buffer.from(bytes);
            if (buf.length > 0) {
              originalBuffer = buf;
              break;
            }
          }
        } catch {
          // Continue trying other candidate extensions
        }
      }

      if (!originalBuffer || originalBuffer.length === 0) {
        try {
          const getRes = await s3.send(
            new GetObjectCommand({
              Bucket: targetBucket,
              Key: cleanBase,
            }),
          );
          if (getRes.Body) {
            const bytes = await getRes.Body.transformToByteArray();
            const buf = Buffer.from(bytes);
            if (buf.length > 0) {
              originalBuffer = buf;
            }
          }
        } catch {
          // Ignore
        }
      }
    }

    // 3c. Try local disk cache
    if (!originalBuffer || originalBuffer.length === 0) {
      for (const ext of candidateExtensions) {
        try {
          const diskPath = resolveDataPath(bucket, `${cleanBase}.${ext}`);
          if (fs.existsSync(diskPath)) {
            const buf = await fs.promises.readFile(diskPath);
            if (buf.length > 0) {
              originalBuffer = buf;
              break;
            }
          }
        } catch {
          // Ignore
        }
      }

      if (!originalBuffer || originalBuffer.length === 0) {
        try {
          const diskPath = resolveDataPath(bucket, cleanBase);
          if (fs.existsSync(diskPath)) {
            const buf = await fs.promises.readFile(diskPath);
            if (buf.length > 0) {
              originalBuffer = buf;
            }
          }
        } catch {
          // Ignore
        }
      }
    }

    if (!originalBuffer || originalBuffer.length === 0) {
      return null;
    }

    // 4. Generate all 4 WebP variants adhering to platform settings
    const summary = await this.generateVariantsForBuffer(originalBuffer, bucket, cleanRequestedKey);

    if (!summary.success) {
      return null;
    }

    // 5. Return the generated variant blob from DB or disk
    const variantBlobKey = `${bucket}/${cleanRequestedKey}`;
    const { rows: variantRows } = await query<{ data: Buffer; content_type: string }>(
      `SELECT data, content_type FROM pd_file_blobs WHERE key = $1 OR key = $2 ORDER BY created_at DESC LIMIT 1`,
      [variantBlobKey, cleanRequestedKey],
    );

    if (variantRows.length > 0 && variantRows[0].data && variantRows[0].data.length > 0) {
      return { buffer: variantRows[0].data, contentType: variantRows[0].content_type || 'image/webp' };
    }

    try {
      const filePath = resolveDataPath(bucket, cleanRequestedKey);
      if (fs.existsSync(filePath)) {
        const diskBuf = await fs.promises.readFile(filePath);
        if (diskBuf.length > 0) {
          return { buffer: diskBuf, contentType: 'image/webp' };
        }
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * On-the-fly variant generator fallback when a requested variant key does not exist yet.
   * Uses single-flight concurrency lock to prevent duplicate Sharp CPU / R2 operations.
   */
  async getOrGenerateVariantOnTheFly(
    bucket: string,
    requestedKey: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const { preset } = this.getBaseKeyAndExtension(requestedKey, bucket);
    if (!preset) {
      return null;
    }

    let cleanKey = requestedKey.replace(/^\/+/, '');
    if (bucket && cleanKey.startsWith(`${bucket}/`)) {
      cleanKey = cleanKey.substring(bucket.length + 1);
    }
    cleanKey = cleanKey.replace(/^(pd-product-images|pd-private-files|pd-themes|pandamarket)\//, '');

    const dedupeKey = `${bucket}:${cleanKey}`;
    const existingPromise = this.inFlightVariantGenerations.get(dedupeKey);
    if (existingPromise) {
      return await existingPromise;
    }

    const generationPromise = (async () => {
      try {
        return await this.doGetOrGenerateVariantOnTheFly(bucket, cleanKey);
      } finally {
        this.inFlightVariantGenerations.delete(dedupeKey);
      }
    })();

    this.inFlightVariantGenerations.set(dedupeKey, generationPromise);
    return await generationPromise;
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
