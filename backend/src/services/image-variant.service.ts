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
import { query } from '../db/pool';
import { resolveDataPath } from '../utils/data-dir';
import { platformConfigService } from './platform-config.service';
import { logger } from '../utils/logger';

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
        const config = presetConfigs[preset];
        const variantKey = this.getVariantKey(baseKeyWithoutExt, preset);
        const blobKey = `${bucket}/${variantKey}`;

        let pipeline = sharp(buffer);

        if (config.crop === 'cover') {
          pipeline = pipeline.resize({
            width: config.width,
            height: config.height,
            fit: 'cover',
            position: 'center',
          });
        } else {
          pipeline = pipeline.resize({
            width: config.width,
            height: config.height,
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

    // Try finding the original file blob in database under common original extensions
    const candidateKeys = [
      `${bucket}/${baseKeyWithoutExt}.jpg`,
      `${bucket}/${baseKeyWithoutExt}.jpeg`,
      `${bucket}/${baseKeyWithoutExt}.png`,
      `${bucket}/${baseKeyWithoutExt}.webp`,
      `${bucket}/${baseKeyWithoutExt}.gif`,
      `${baseKeyWithoutExt}.jpg`,
      `${baseKeyWithoutExt}.png`,
      `${baseKeyWithoutExt}.webp`,
    ];

    const { rows } = await query<{ data: Buffer }>(
      `SELECT data FROM pd_file_blobs
       WHERE key = ANY($1::text[])
       ORDER BY created_at DESC LIMIT 1`,
      [candidateKeys],
    );

    if (rows.length === 0 || !rows[0].data) {
      return null;
    }

    const originalBuffer = rows[0].data;
    const summary = await this.generateVariantsForBuffer(originalBuffer, bucket, requestedKey);

    if (!summary.success) {
      return null;
    }

    // Return the generated variant blob from DB
    const variantBlobKey = `${bucket}/${requestedKey}`;
    const { rows: variantRows } = await query<{ data: Buffer; content_type: string }>(
      `SELECT data, content_type FROM pd_file_blobs WHERE key = $1 OR key = $2 LIMIT 1`,
      [variantBlobKey, requestedKey],
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
      let bucket = row.bucket || 'pd-product-images';

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
