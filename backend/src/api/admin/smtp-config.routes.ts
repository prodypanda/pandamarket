import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { query } from '../../db/pool';
import { PdValidationError } from '../../errors';
import { asyncHandler, requireAdmin, requireAuth, validate } from '../../middlewares';
import { adminNotesService } from '../../services/admin-notes.service';
import { imageVariantService } from '../../services/image-variant.service';
import { smtpConfigService } from '../../services/smtp-config.service';
import { pdId } from '../../utils/crypto';
import { resolveDataPath } from '../../utils/data-dir';
import { logger } from '../../utils/logger';
import { publicUrl } from '../../utils/s3';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** SMTP Email Configuration — extracted from admin.route.ts (E15 split). */
const router = Router();

const smtpConfigSchema = z.object({
  smtp_host: z.string().min(1).max(255),
  smtp_port: z.coerce.number().int().min(1).max(65535),
  smtp_user: z.string().max(255).default(''),
  smtp_pass: z.string().max(500).optional().default(''), // empty = keep existing
  smtp_secure: z.boolean().default(false),
  smtp_from_name: z.string().min(1).max(200).default('PandaMarket'),
  smtp_from_email: z.string().email().max(255).default('noreply@pandamarket.tn'),
  smtp_enabled: z.boolean().default(false),
  email_transport: z.enum(['smtp', 'brevo_api']).default('smtp'),
  brevo_api_key: z.string().max(500).optional().default(''), // empty = keep existing
});

/**
 * GET /admin/smtp-config — Retrieve current SMTP configuration.
 * Password is never returned — only a boolean indicating if it's set.
 */
router.get(
  '/smtp-config',
  asyncHandler(async (_req: Request, res: Response) => {
    const config = await smtpConfigService.getPublicConfig();
    res.status(200).json({ data: config });
  }),
);

/**
 * PUT /admin/smtp-config — Save SMTP configuration.
 * Password is encrypted at rest using AES-256-GCM.
 * If smtp_pass is empty, the existing password is preserved.
 */
router.put(
  '/smtp-config',
  validate(smtpConfigSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await smtpConfigService.saveConfig(req.body, req.user!.id);
    logger.info({ admin_id: req.user!.id }, 'Admin updated SMTP configuration');
    res.status(200).json({ success: true, message: 'SMTP configuration saved' });
  }),
);

const smtpTestSchema = z.object({
  smtp_host: z.string().min(1).max(255).optional(),
  smtp_port: z.coerce.number().int().min(1).max(65535).optional(),
  smtp_user: z.string().max(255).optional(),
  smtp_pass: z.string().max(500).optional(),
  smtp_secure: z.boolean().optional(),
  smtp_from_name: z.string().max(200).optional(),
  smtp_from_email: z.string().email().max(255).optional(),
  recipient_email: z.string().email().max(255).optional(),
  email_transport: z.enum(['smtp', 'brevo_api']).optional(),
  brevo_api_key: z.string().max(500).optional(),
});

/**
 * POST /admin/smtp-config/test — Test SMTP connection.
 * Optionally sends a test email to the specified recipient.
 * Can test with unsaved config (pass overrides in body) or saved config (empty body).
 */
router.post(
  '/smtp-config/test',
  validate(smtpTestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { recipient_email, ...overrides } = req.body;

    // Use overrides when an SMTP host is provided or when testing the Brevo API transport;
    // otherwise test the saved config.
    const hasOverrides =
      (overrides.smtp_host && overrides.smtp_host.length > 0)
      || overrides.email_transport === 'brevo_api';

    const result = await smtpConfigService.testConnection(
      hasOverrides
        ? {
            smtp_host: overrides.smtp_host,
            smtp_port: overrides.smtp_port ?? 587,
            smtp_user: overrides.smtp_user ?? '',
            smtp_pass: overrides.smtp_pass,
            smtp_secure: overrides.smtp_secure ?? false,
            smtp_from_name: overrides.smtp_from_name ?? 'PandaMarket',
            smtp_from_email: overrides.smtp_from_email ?? 'noreply@pandamarket.tn',
            email_transport: overrides.email_transport,
            brevo_api_key: overrides.brevo_api_key,
          }
        : undefined,
      recipient_email,
    );

    res.status(result.success ? 200 : 422).json(result);
  }),
);

/**
 * GET /admin/platform-media — List platform media assets stored in database pd_file_blobs
 * Query: ?folder=all|categories|branding|banners|general&search=...
 */
router.get(
  '/platform-media',
  asyncHandler(async (req: Request, res: Response) => {
    const folderFilter = typeof req.query.folder === 'string' ? req.query.folder.trim() : 'all';
    const searchQuery =
      typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    const sql = `
      SELECT b.key, b.bucket, b.content_type, OCTET_LENGTH(b.data) as size, b.created_at, b.data, a.filename as asset_filename
      FROM pd_file_blobs b
      LEFT JOIN pd_file_asset a ON (a.file_key = b.key OR a.url LIKE '%' || b.key)
      WHERE b.bucket = 'pd-product-images'
        AND b.key NOT LIKE '%_thumbnail.webp'
        AND b.key NOT LIKE '%_small.webp'
        AND b.key NOT LIKE '%_medium.webp'
        AND b.key NOT LIKE '%_large.webp'
      ORDER BY b.created_at DESC
    `;

    const result = await query(sql);

    const items = await Promise.all(
      result.rows.map(async (row: any) => {
        const rawKey = row.key as string;
        let cleanKey = rawKey;
        if (cleanKey.startsWith(`${row.bucket}/`)) {
          cleanKey = cleanKey.substring(row.bucket.length + 1);
        }
        const pathParts = cleanKey.split('/');

        let folder = 'general';
        if (
          pathParts.length >= 2 &&
          ['categories', 'branding', 'banners', 'general'].includes(pathParts[1])
        ) {
          folder = pathParts[1];
        } else if (
          pathParts.length >= 3 &&
          ['categories', 'branding', 'banners', 'general'].includes(pathParts[2])
        ) {
          folder = pathParts[2];
        } else if (
          cleanKey.toLowerCase().includes('category') ||
          cleanKey.toLowerCase().includes('cat_') ||
          cleanKey.toLowerCase().includes('marketplace/pd_user_')
        ) {
          folder = 'categories';
        } else if (
          cleanKey.toLowerCase().includes('logo') ||
          cleanKey.toLowerCase().includes('favicon') ||
          cleanKey.toLowerCase().includes('brand')
        ) {
          folder = 'branding';
        } else if (
          cleanKey.toLowerCase().includes('banner') ||
          cleanKey.toLowerCase().includes('hero') ||
          cleanKey.toLowerCase().includes('slide')
        ) {
          folder = 'banners';
        }

        const filename = row.asset_filename || pathParts[pathParts.length - 1] || cleanKey;
        const url = `/${row.bucket}/${cleanKey}`;
        let width: number | null = null;
        let height: number | null = null;

        if (row.data && row.content_type?.startsWith('image/')) {
          try {
            const meta = await sharp(row.data).metadata();
            width = meta.width ?? null;
            height = meta.height ?? null;
          } catch {
            // Ignore sharp metadata error
          }
        }

        return {
          key: cleanKey,
          url,
          filename,
          folder,
          content_type: row.content_type || 'image/jpeg',
          size: parseInt(row.size, 10) || 0,
          width,
          height,
          dimensions: width && height ? `${width} × ${height} px` : null,
          created_at: row.created_at,
        };
      }),
    );

    const filtered = items.filter((item: any) => {
      if (folderFilter !== 'all' && item.folder !== folderFilter) return false;
      if (
        searchQuery &&
        !item.filename.toLowerCase().includes(searchQuery) &&
        !item.key.toLowerCase().includes(searchQuery)
      )
        return false;
      return true;
    });

    res.status(200).json({
      success: true,
      data: filtered,
      summary: {
        total: items.length,
        categories: items.filter((i: any) => i.folder === 'categories').length,
        branding: items.filter((i: any) => i.folder === 'branding').length,
        banners: items.filter((i: any) => i.folder === 'banners').length,
        general: items.filter((i: any) => i.folder === 'general').length,
      },
    });
  }),
);

const renameMediaSchema = z.object({
  key: z.string().min(1),
  new_filename: z.string().min(1).max(255),
});

/**
 * PATCH /admin/platform-media/rename — Rename a platform picture while preserving original file extension
 */
router.patch(
  '/platform-media/rename',
  validate(renameMediaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { key, new_filename } = req.body;

    const findResult = await query(
      'SELECT key, content_type FROM pd_file_blobs WHERE key = $1 OR key = $2 ORDER BY created_at DESC LIMIT 1',
      [key, `pd-product-images/${key}`],
    );
    if (findResult.rows.length === 0) {
      throw new PdValidationError('Media asset not found in database');
    }

    const rawKey = findResult.rows[0].key as string;
    const pathParts = rawKey.split('/');
    const originalFilename = pathParts[pathParts.length - 1] || rawKey;
    const extMatch = originalFilename.match(/\.([a-zA-Z0-9]+)$/);
    const originalExt = extMatch ? extMatch[1].toLowerCase() : '';

    let cleanName = new_filename.trim().replace(/[/\\]/g, '');
    if (originalExt) {
      cleanName = cleanName.replace(new RegExp(`\\.${originalExt}$`, 'i'), '');
      cleanName = cleanName.replace(/\.[a-zA-Z0-9]+$/, '');
      cleanName = `${cleanName}.${originalExt}`;
    }

    await query(
      `INSERT INTO pd_file_asset (id, scope, purpose, url, file_key, bucket, filename, content_type, file_size)
       VALUES ($1, 'platform', 'marketplace_asset', $2, $3, 'pd-product-images', $4, $5, 0)
       ON CONFLICT (file_key) DO UPDATE SET filename = EXCLUDED.filename, updated_at = NOW()`,
      [pdId('asset'), publicUrl(key), key, cleanName, findResult.rows[0].content_type || 'image/jpeg'],
    );

    logger.info(
      { admin_id: req.user!.id, key, new_filename: cleanName },
      'Admin renamed platform media picture',
    );

    res.status(200).json({
      success: true,
      key,
      new_filename: cleanName,
    });
  }),
);

/**
 * DELETE /admin/platform-media — Delete a platform media asset from database pd_file_blobs and local cache
 * Body or Query: { key: string }
 */
router.delete(
  '/platform-media',
  asyncHandler(async (req: Request, res: Response) => {
    const key = (req.body.key || req.query.key || '') as string;
    if (!key) {
      throw new PdValidationError('Asset key is required');
    }

    const { baseKeyWithoutExt } = imageVariantService.getBaseKeyAndExtension(key);
    const variants = ['thumbnail', 'small', 'medium', 'large'].map(p => `${baseKeyWithoutExt}_${p}.webp`);
    const allKeysToDelete = [key, ...variants];
    const prefixedKeys = allKeysToDelete.map((k) => `pd-product-images/${k}`);

    await query('DELETE FROM pd_file_blobs WHERE key = ANY($1) OR key = ANY($2)', [allKeysToDelete, prefixedKeys]);
    await query(
      'DELETE FROM pd_file_asset WHERE file_key = $1 OR file_key LIKE $2 OR url LIKE $2',
      [key, `%${key}%`],
    );

    for (const k of [...allKeysToDelete, ...prefixedKeys]) {
      try {
        const diskPath = path.join(resolveDataPath(), k);
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      } catch {
        // Ignore disk delete error
      }
    }

    logger.info({ admin_id: req.user!.id, key }, 'Admin deleted platform media asset');

    res.status(200).json({
      success: true,
      message: 'Platform media asset deleted successfully',
    });
  }),
);

const optimizeMediaSchema = z.object({
  key: z.string().min(1),
  quality: z.number().int().min(30).max(100).optional().default(80),
  maxWidth: z.number().int().min(100).max(3840).optional().default(1600),
  format: z.enum(['webp', 'jpeg', 'png', 'original']).optional().default('webp'),
});

/**
 * POST /admin/platform-media/optimize — Compress and optimize a single platform picture asset
 */
router.post(
  '/platform-media/optimize',
  validate(optimizeMediaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { key, quality, maxWidth, format } = req.body;

    const findResult = await query(
      'SELECT data, content_type FROM pd_file_blobs WHERE key = $1 OR key = $2 ORDER BY created_at DESC LIMIT 1',
      [key, `pd-product-images/${key}`],
    );
    if (findResult.rows.length === 0) {
      throw new PdValidationError('Media asset not found in database');
    }

    const row = findResult.rows[0];
    const originalBuffer = row.data as Buffer;
    const originalSize = originalBuffer ? originalBuffer.length : 0;

    if (!originalBuffer || originalSize === 0) {
      throw new PdValidationError('Media file is empty');
    }

    let pipeline = sharp(originalBuffer);
    const metadata = await pipeline.metadata();

    if (metadata.width && metadata.width > maxWidth) {
      pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
    }

    let targetContentType = row.content_type || 'image/jpeg';
    let targetFormat = format;
    if (targetFormat === 'original') {
      if (row.content_type === 'image/png') targetFormat = 'png';
      else if (row.content_type === 'image/webp') targetFormat = 'webp';
      else targetFormat = 'jpeg';
    }

    if (targetFormat === 'webp') {
      pipeline = pipeline.webp({ quality, effort: 4 });
      targetContentType = 'image/webp';
    } else if (targetFormat === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      targetContentType = 'image/jpeg';
    } else if (targetFormat === 'png') {
      pipeline = pipeline.png({ quality, compressionLevel: 8 });
      targetContentType = 'image/png';
    }

    const compressedBuffer = await pipeline.toBuffer();
    const newSize = compressedBuffer.length;
    const savedBytes = Math.max(0, originalSize - newSize);
    const savedPercentage = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : '0';

    await query(
      'UPDATE pd_file_blobs SET data = $1, content_type = $2, created_at = NOW() WHERE key = $3',
      [compressedBuffer, targetContentType, key],
    );

    await query(
      `UPDATE pd_file_asset
       SET file_size = $1, content_type = $2, updated_at = NOW()
       WHERE file_key = $3 OR file_key LIKE $4 OR url LIKE $4`,
      [newSize, targetContentType, key, `%${key}%`],
    );

    try {
      const diskPath = path.join(resolveDataPath(), key);
      if (fs.existsSync(diskPath)) {
        fs.writeFileSync(diskPath, compressedBuffer);
      }
    } catch {
      // Ignore disk sync error
    }

    logger.info(
      { admin_id: req.user!.id, key, originalSize, newSize, savedBytes, savedPercentage },
      'Admin compressed platform media picture',
    );

    res.status(200).json({
      success: true,
      key,
      original_size: originalSize,
      new_size: newSize,
      saved_bytes: savedBytes,
      saved_percentage: savedPercentage,
      content_type: targetContentType,
    });
  }),
);

/**
 * POST /admin/platform-media/optimize-all — Bulk optimize all pictures in a folder
 */
router.post(
  '/platform-media/optimize-all',
  asyncHandler(async (req: Request, res: Response) => {
    const folderFilter = (req.body.folder || 'all') as string;
    const quality = req.body.quality || 80;
    const maxWidth = req.body.maxWidth || 1600;

    const findResult = await query(
      `SELECT key, data, content_type FROM pd_file_blobs 
       WHERE bucket = 'pd-product-images' 
         AND key NOT LIKE '%_thumbnail.webp'
         AND key NOT LIKE '%_small.webp'
         AND key NOT LIKE '%_medium.webp'
         AND key NOT LIKE '%_large.webp'
       ORDER BY created_at DESC`,
    );

    let totalOriginal = 0;
    let totalNew = 0;
    let processedCount = 0;

    for (const row of findResult.rows) {
      const rawKey = row.key as string;
      const pathParts = rawKey.split('/');

      let folder = 'general';
      if (
        pathParts.length >= 3 &&
        ['categories', 'branding', 'banners', 'general'].includes(pathParts[2])
      ) {
        folder = pathParts[2];
      } else if (
        rawKey.toLowerCase().includes('category') ||
        rawKey.toLowerCase().includes('cat_') ||
        rawKey.toLowerCase().includes('marketplace/pd_user_')
      ) {
        folder = 'categories';
      } else if (
        rawKey.toLowerCase().includes('logo') ||
        rawKey.toLowerCase().includes('favicon') ||
        rawKey.toLowerCase().includes('brand')
      ) {
        folder = 'branding';
      } else if (
        rawKey.toLowerCase().includes('banner') ||
        rawKey.toLowerCase().includes('hero') ||
        rawKey.toLowerCase().includes('slide')
      ) {
        folder = 'banners';
      }

      if (folderFilter !== 'all' && folder !== folderFilter) continue;

      const originalBuffer = row.data as Buffer;
      if (!originalBuffer || originalBuffer.length === 0) continue;

      const originalSize = originalBuffer.length;

      try {
        let pipeline = sharp(originalBuffer);
        const metadata = await pipeline.metadata();

        if (metadata.width && metadata.width > maxWidth) {
          pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
        }

        const compressedBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
        const newSize = compressedBuffer.length;

        if (newSize < originalSize) {
          await query('UPDATE pd_file_blobs SET data = $1, content_type = $2 WHERE key = $3', [
            compressedBuffer,
            'image/webp',
            rawKey,
          ]);

          await query(
            `UPDATE pd_file_asset
             SET file_size = $1, content_type = $2, updated_at = NOW()
             WHERE file_key = $3 OR file_key LIKE $4 OR url LIKE $4`,
            [newSize, 'image/webp', rawKey, `%${rawKey}%`],
          );

          try {
            const diskPath = path.join(resolveDataPath(), rawKey);
            if (fs.existsSync(diskPath)) {
              fs.writeFileSync(diskPath, compressedBuffer);
            }
          } catch {
        // Non-fatal: best-effort local mirror / variant generation
      }

          totalOriginal += originalSize;
          totalNew += newSize;
          processedCount++;
        }
      } catch (err) {
        logger.warn({ key: rawKey, err }, 'Failed to optimize picture during bulk operation');
      }
    }

    const totalSavedBytes = Math.max(0, totalOriginal - totalNew);
    const totalSavedPercentage =
      totalOriginal > 0 ? ((totalSavedBytes / totalOriginal) * 100).toFixed(1) : '0';

    res.status(200).json({
      success: true,
      processed_count: processedCount,
      total_original_size: totalOriginal,
      total_new_size: totalNew,
      total_saved_bytes: totalSavedBytes,
      total_saved_percentage: totalSavedPercentage,
    });
  }),
);

/**
 * POST /admin/platform-media/regenerate-variants — Bulk regenerate all multi-size image variants
 */
router.post(
  '/platform-media/regenerate-variants',
  asyncHandler(async (_req: Request, res: Response) => {
    const summary = await imageVariantService.regenerateAllVariants();
    res.status(200).json({
      success: true,
      data: summary,
    });
  }),
);

// ───────────────────────────────────────────────────────────
// Admin Notes / Reminders / Drafts (v2)
// ───────────────────────────────────────────────────────────

const noteTypeSchema = z.enum(['note', 'reminder', 'draft']);
const notePrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
const noteStatusSchema = z.enum(['active', 'archived', 'trashed']);
const noteContentFormatSchema = z.enum(['plain', 'markdown']);

const createNoteSchema = z.object({
  type: noteTypeSchema,
  folder_id: z.string().max(36).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  title: z.string().min(1).max(500),
  content: z.string().max(50000).optional(),
  content_format: noteContentFormatSchema.optional(),
  color: z.string().max(20).optional(),
  priority: notePrioritySchema.optional(),
  is_pinned: z.boolean().optional(),
  reminder_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  due_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const updateNoteSchema = z.object({
  folder_id: z.string().max(36).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(50000).optional(),
  content_format: noteContentFormatSchema.optional(),
  type: noteTypeSchema.optional(),
  color: z.string().max(20).optional(),
  priority: notePrioritySchema.optional(),
  is_pinned: z.boolean().optional(),
  is_completed: z.boolean().optional(),
  reminder_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  due_at: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const noteListSchema = z.object({
  folder_id: z.string().max(36).nullable().optional().or(z.literal('').transform(() => null)),
  type: noteTypeSchema.optional(),
  status: noteStatusSchema.optional(),
  priority: notePrioritySchema.optional(),
  pinned: z.coerce.boolean().optional(),
  completed: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  upcoming: z.coerce.boolean().optional(),
  upcoming_within_hours: z.coerce.number().int().min(1).max(168).optional(),
  search: z.string().max(200).optional(),
  tag: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const bulkNoteIdsSchema = z.object({
  ids: z.array(z.string().max(64)).min(1).max(200),
});

const bulkCompleteSchema = z.object({
  ids: z.array(z.string().max(64)).min(1).max(200),
  completed: z.boolean(),
});

const checklistItemSchema = z.object({
  content: z.string().min(1).max(1000),
  sort_order: z.number().int().min(0).optional(),
});

const checklistItemUpdateSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  is_done: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const attachmentSchema = z.object({
  file_key: z.string().min(1).max(1024),
  bucket: z.string().min(1).max(128),
  filename: z.string().min(1).max(500),
  content_type: z.string().max(128).default('application/octet-stream'),
  file_size: z
    .number()
    .int()
    .min(0)
    .max(110 * 1024 * 1024),
  scope: z.string().max(20).optional(),
});

const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional(),
  sort_order: z.number().int().min(0).optional(),
});

const updateSortOrderSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().max(36),
      sort_order: z.number().int().min(0),
    })
  ).min(1).max(500),
});

const moveToFolderSchema = z.object({
  folder_id: z.string().max(36).nullable().or(z.literal('').transform(() => null)),
});

// ───────────────────────────────────────────────────────────
// Folders
// ───────────────────────────────────────────────────────────

router.get(
  '/notes/folders',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const folders = await adminNotesService.listFolders(req.user!.id);
    res.status(200).json({ data: folders });
  }),
);

router.post(
  '/notes/folders',
  requireAuth,
  requireAdmin,
  validate(createFolderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const folder = await adminNotesService.createFolder(req.user!.id, req.body.name, req.body.color);
    res.status(201).json({ data: folder });
  }),
);

router.put(
  '/notes/folders/:id',
  requireAuth,
  requireAdmin,
  validate(updateFolderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const folder = await adminNotesService.updateFolder(req.params.id, req.user!.id, req.body);
    res.status(200).json({ data: folder });
  }),
);

router.delete(
  '/notes/folders/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    await adminNotesService.deleteFolder(req.params.id, req.user!.id);
    res.status(204).end();
  }),
);

router.post(
  '/notes/folders/sort',
  requireAuth,
  requireAdmin,
  validate(updateSortOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await adminNotesService.updateFolderSortOrder(req.body.updates, req.user!.id);
    res.status(200).json({ success: true });
  }),
);

router.post(
  '/notes/sort',
  requireAuth,
  requireAdmin,
  validate(updateSortOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await adminNotesService.updateNoteSortOrder(req.body.updates, req.user!.id);
    res.status(200).json({ success: true });
  }),
);

router.post(
  '/notes/:id/move',
  requireAuth,
  requireAdmin,
  validate(moveToFolderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.moveToFolder(req.params.id, req.user!.id, req.body.folder_id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// List notes (supports all v2 filters)
router.get(
  '/notes',
  requireAuth,
  requireAdmin,
  validate(noteListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as {
      folder_id?: string | null;
      type?: string;
      status?: 'active' | 'archived' | 'trashed';
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      pinned?: boolean;
      completed?: boolean;
      overdue?: boolean;
      upcoming?: boolean;
      upcoming_within_hours?: number;
      search?: string;
      tag?: string;
      page?: number;
      limit?: number;
    };
    const result = await adminNotesService.list(req.user!.id, {
      folder_id: q.folder_id,
      type: q.type,
      status: q.status,
      priority: q.priority,
      pinned: typeof q.pinned === 'string' ? q.pinned === 'true' : q.pinned,
      completed: typeof q.completed === 'string' ? q.completed === 'true' : q.completed,
      overdue: typeof q.overdue === 'string' ? q.overdue === 'true' : q.overdue,
      upcoming: typeof q.upcoming === 'string' ? q.upcoming === 'true' : q.upcoming,
      upcoming_within_hours: q.upcoming_within_hours,
      search: q.search,
      tag: q.tag,
      page: q.page,
      limit: q.limit,
    });
    res.status(200).json(result);
  }),
);

// Dashboard statistics
router.get(
  '/notes/stats',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await adminNotesService.stats(req.user!.id);
    res.status(200).json({ data: stats });
  }),
);

// Export (CSV / JSON)
router.get(
  '/notes/export',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const format = req.query.format === 'json' ? 'json' : 'csv';
    const { contentType, body, filename } = await adminNotesService.exportNotes(
      req.user!.id,
      format,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(body);
  }),
);

// Bulk operations
router.post(
  '/notes/bulk/archive',
  requireAuth,
  requireAdmin,
  validate(bulkNoteIdsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkArchive(req.body.ids, req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

router.post(
  '/notes/bulk/trash',
  requireAuth,
  requireAdmin,
  validate(bulkNoteIdsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkTrash(req.body.ids, req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

router.post(
  '/notes/bulk/restore',
  requireAuth,
  requireAdmin,
  validate(bulkNoteIdsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkRestore(req.body.ids, req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

router.post(
  '/notes/bulk/delete',
  requireAuth,
  requireAdmin,
  validate(bulkNoteIdsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkDelete(req.body.ids, req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

router.post(
  '/notes/bulk/complete',
  requireAuth,
  requireAdmin,
  validate(bulkCompleteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.bulkComplete(
      req.body.ids,
      req.user!.id,
      req.body.completed,
    );
    res.status(200).json({ affected: count });
  }),
);

router.delete(
  '/notes/trash/empty',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const count = await adminNotesService.emptyTrash(req.user!.id);
    res.status(200).json({ affected: count });
  }),
);

// Create note
router.post(
  '/notes',
  requireAuth,
  requireAdmin,
  validate(createNoteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.create({
      admin_id: req.user!.id,
      ...req.body,
    });
    res.status(201).json({ data: note });
  }),
);

// Get single note (with checklist + attachments)
router.get(
  '/notes/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.getById(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Update note
router.put(
  '/notes/:id',
  requireAuth,
  requireAdmin,
  validate(updateNoteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.update(req.params.id, req.user!.id, req.body);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Lifecycle: archive / trash / restore
router.patch(
  '/notes/:id/archive',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.archive(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

router.patch(
  '/notes/:id/trash',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.trash(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

router.patch(
  '/notes/:id/restore',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.restore(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Permanently delete (only from trash)
router.delete(
  '/notes/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await adminNotesService.delete(req.params.id, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ success: true });
  }),
);

// Toggle pin
router.patch(
  '/notes/:id/pin',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.togglePin(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Toggle complete
router.patch(
  '/notes/:id/complete',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const note = await adminNotesService.toggleComplete(req.params.id, req.user!.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: note });
  }),
);

// Checklist items
router.post(
  '/notes/:id/checklist',
  requireAuth,
  requireAdmin,
  validate(checklistItemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const item = await adminNotesService.addChecklistItem(
      req.params.id,
      req.user!.id,
      req.body.content,
      req.body.sort_order ?? 0,
    );
    if (!item) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(201).json({ data: item });
  }),
);

router.patch(
  '/notes/:id/checklist/:itemId',
  requireAuth,
  requireAdmin,
  validate(checklistItemUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const item = await adminNotesService.updateChecklistItem(
      req.params.id,
      req.params.itemId,
      req.user!.id,
      req.body,
    );
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(200).json({ data: item });
  }),
);

router.delete(
  '/notes/:id/checklist/:itemId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await adminNotesService.removeChecklistItem(
      req.params.id,
      req.params.itemId,
      req.user!.id,
    );
    if (!ok) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(200).json({ success: true });
  }),
);

// Attachments
router.post(
  '/notes/:id/attachments',
  requireAuth,
  requireAdmin,
  validate(attachmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const att = await adminNotesService.addAttachment(req.params.id, req.user!.id, req.body);
    if (!att) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(201).json({ data: att });
  }),
);

router.delete(
  '/notes/:id/attachments/:attachmentId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await adminNotesService.removeAttachment(
      req.params.id,
      req.params.attachmentId,
      req.user!.id,
    );
    if (!ok) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }
    res.status(200).json({ success: true });
  }),
);

// Activity log
router.get(
  '/notes/:id/activity',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const activities = await adminNotesService.listActivity(req.params.id, req.user!.id);
    res.status(200).json({ data: activities });
  }),
);
export default router;