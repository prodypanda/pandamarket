/**
 * File upload routes — presigned URL generation for S3/MinIO.
 *
 * Clients upload directly to S3 using the presigned URL (never through the backend).
 * This endpoint generates the URL with proper bucket routing, path structure,
 * and content-type/size validation.
 */

import express, { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { asyncHandler, requireAuth, optionalAuth, requireStorefrontCustomer, validate } from '../middlewares';
import { presignUploadSchema } from '../validators';
import { presignDownload, presignUpload, publicUrl } from '../utils/s3';
import { config } from '../config';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { PdValidationError, PdErrorCode, PdForbiddenError, PdAuthenticationError } from '../errors';
import { fileAssetService } from '../services/file-asset.service';
import { resolveDataPath } from '../utils/data-dir';
import { reportService } from '../services/report.service';
import { chatService } from '../services/chat.service';
import { query } from '../db/pool';
import { UserRole } from '@pandamarket/types';
import { signMockFileToken, verifyMockFileToken } from '../utils/jwt';

const router = Router();
export const mockFilesRouter = Router();

const fileAccessSchema = z.object({
  key: z.string().min(1).max(1024),
});

// Upload rate limit: 10 uploads per 5 minutes per user
const uploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown',
  message: {
    error: {
      code: PdErrorCode.RATE_LIMITED,
      message: 'Too many upload requests. Please wait before uploading more files.',
    },
  },
});

// Allowed MIME types per purpose
const ALLOWED_TYPES: Record<string, string[]> = {
  product_image: ['image/jpeg', 'image/png', 'image/webp'],
  digital_product: [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'text/plain',
  ],
  kyc_document: ['image/jpeg', 'image/png', 'application/pdf'],
  mandat_proof: ['image/jpeg', 'image/png'],
  theme_asset: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  marketplace_asset: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'],
  report_evidence: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'],
  chat_image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  delivery_proof: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  admin_note_attachment: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/zip',
  ],
};

// Max file sizes per purpose (bytes)
const MAX_SIZES: Record<string, number> = {
  product_image: 10 * 1024 * 1024, // 10 MB
  digital_product: 100 * 1024 * 1024,
  kyc_document: 10 * 1024 * 1024, // 10 MB
  mandat_proof: 10 * 1024 * 1024, // 10 MB
  theme_asset: 5 * 1024 * 1024, // 5 MB
  marketplace_asset: 25 * 1024 * 1024,
  report_evidence: 20 * 1024 * 1024,
  chat_image: 5 * 1024 * 1024,
  delivery_proof: 10 * 1024 * 1024,
  admin_note_attachment: 25 * 1024 * 1024,
};

/**
 * POST /api/pd/files/presign
 *
 * Body: { filename, content_type, purpose }
 * Returns: { upload_url, file_key, public_url? }
 */
router.post(
  '/presign',
  optionalAuth,
  uploadRateLimit,
  validate(presignUploadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { filename, content_type, purpose, file_size } = req.body;

    // Only mandat_proof allows guest presigned uploads
    if (purpose !== 'mandat_proof' && !req.user) {
      throw new PdAuthenticationError(
        PdErrorCode.AUTH_TOKEN_INVALID,
        'Authentication required',
      );
    }

    // Validate content type for the given purpose
    const allowed = ALLOWED_TYPES[purpose];
    if (!allowed || !allowed.includes(content_type)) {
      throw new PdValidationError('File type not allowed for this purpose', {
        code: PdErrorCode.FILE_INVALID_TYPE,
        valid_types: allowed,
        provided: content_type,
      });
    }

    const chatLimits = purpose === 'chat_image' ? await chatService.getChatLimits() : null;
    const maxSize = purpose === 'chat_image' ? chatLimits!.maxImageSizeBytes : MAX_SIZES[purpose];

    if (file_size !== undefined && file_size > maxSize) {
      throw new PdValidationError('File is too large for this purpose', {
        code: PdErrorCode.FILE_TOO_LARGE,
        max_size: maxSize,
        provided_size: file_size,
      });
    }

    if (
      purpose === 'marketplace_asset' &&
      req.user!.role !== UserRole.Admin &&
      req.user!.role !== UserRole.SuperAdmin
    ) {
      throw new PdForbiddenError(
        PdErrorCode.PERM_FORBIDDEN,
        'Only admins can upload marketplace assets',
      );
    }

    // Determine bucket and key path
    let bucket: string;
    let keyPrefix: string;
    const uniqueId = pdId('file');
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
    const safeFilename = `${uniqueId}.${ext}`;
    const uploaderId = req.user ? req.user.id : `guest_${uniqueId}`;

    switch (purpose) {
      case 'product_image':
        bucket = config.s3.bucketPublic;
        keyPrefix = `products/${req.user!.store_id ?? req.user!.id}`;
        break;
      case 'digital_product':
        if (!req.user!.store_id) {
          throw new PdForbiddenError(
            PdErrorCode.PERM_FORBIDDEN,
            'Only vendors can upload digital products',
          );
        }
        bucket = config.s3.bucketPrivate;
        keyPrefix = `digital/${req.user!.store_id}`;
        break;
      case 'kyc_document':
        bucket = config.s3.bucketPrivate;
        keyPrefix = `kyc/${req.user!.store_id ?? req.user!.id}`;
        break;
      case 'mandat_proof':
        bucket = config.s3.bucketPrivate;
        keyPrefix = `mandats/${uploaderId}`;
        break;
      case 'theme_asset':
        bucket = config.s3.bucketThemes;
        keyPrefix = `themes/${req.user!.store_id ?? req.user!.id}`;
        break;
      case 'marketplace_asset':
        bucket = config.s3.bucketPublic;
        const subFolder =
          req.body.folder &&
          ['categories', 'branding', 'banners', 'general'].includes(req.body.folder)
            ? req.body.folder
            : 'general';
        keyPrefix = `marketplace/${subFolder}/${req.user!.id}`;
        break;
      case 'report_evidence':
        bucket = config.s3.bucketPrivate;
        keyPrefix = `reports/${req.user!.id}`;
        break;
      case 'chat_image':
        bucket = config.s3.bucketPrivate;
        keyPrefix = `chat/${req.user!.id}`;
        break;
      case 'delivery_proof':
        if (!req.user!.store_id) {
          throw new PdForbiddenError(
            PdErrorCode.PERM_FORBIDDEN,
            'Only vendors can upload delivery proof',
          );
        }
        bucket = config.s3.bucketPrivate;
        keyPrefix = `delivery-proofs/${req.user!.store_id}`;
        break;
      case 'admin_note_attachment':
        if (req.user!.role !== UserRole.Admin && req.user!.role !== UserRole.SuperAdmin) {
          throw new PdForbiddenError(
            PdErrorCode.PERM_FORBIDDEN,
            'Only admins can upload note attachments',
          );
        }
        bucket = config.s3.bucketPrivate;
        keyPrefix = `admin-notes/${req.user!.id}`;
        break;
      default:
        throw new PdValidationError('Invalid purpose');
    }

    const fileKey = `${keyPrefix}/${safeFilename}`;

    const isS3Local =
      config.s3.endpoint.includes('localhost') || config.s3.endpoint.includes('127.0.0.1');
    const host = req.get('host');
    const protocol = req.protocol;

    const currentUserId = req.user ? req.user.id : uploaderId;
    const currentStoreId = req.user?.store_id ?? null;

    const uploadToken = signMockFileToken({
      type: 'mock_file_upload',
      bucket,
      key: fileKey,
      owner_id: currentUserId,
      store_id: currentStoreId,
      purpose,
      max_size: maxSize,
      content_type,
    });

    const uploadUrl = isS3Local
      ? `${protocol}://${host}/api/pd/files/upload-s3-mock/${bucket}/${fileKey}?token=${uploadToken}`
      : await presignUpload({
          bucket,
          key: fileKey,
          contentType: content_type,
          expiresInSeconds: 900, // 15 minutes
        });

    // For public bucket, also return the public URL
    const isPublic = bucket === config.s3.bucketPublic;

    logger.info(
      { purpose, bucket, key: fileKey, user_id: currentUserId },
      'Presigned upload URL generated',
    );

    const publicAssetUrl = isPublic ? publicUrl(fileKey) : undefined;
    const asset = publicAssetUrl
      ? await fileAssetService.registerAsset({
          scope: purpose === 'marketplace_asset' ? 'platform' : 'store',
          purpose,
          url: publicAssetUrl,
          file_key: fileKey,
          bucket,
          filename,
          content_type,
          file_size: file_size ?? null,
          owner_user_id: req.user!.id,
          store_id: purpose === 'marketplace_asset' ? null : (req.user!.store_id ?? null),
        })
      : null;

    res.status(200).json({
      upload_url: uploadUrl,
      file_key: fileKey,
      public_url: publicAssetUrl,
      asset,
      max_size: maxSize,
      expires_in: 900,
    });
  }),
);

router.post(
  '/storefront/presign',
  requireStorefrontCustomer,
  uploadRateLimit,
  validate(presignUploadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { filename, content_type, purpose, file_size } = req.body;

    if (purpose !== 'mandat_proof') {
      throw new PdValidationError('Storefront customers can only upload mandat proof files', {
        code: PdErrorCode.FILE_INVALID_TYPE,
      });
    }

    const allowed = ALLOWED_TYPES['mandat_proof'];
    if (!allowed.includes(content_type)) {
      throw new PdValidationError('File type not allowed for mandat proof', {
        code: PdErrorCode.FILE_INVALID_TYPE,
        valid_types: allowed,
        provided: content_type,
      });
    }

    const maxSize = MAX_SIZES['mandat_proof'];
    if (file_size !== undefined && file_size > maxSize) {
      throw new PdValidationError('File is too large for mandat proof', {
        code: PdErrorCode.FILE_TOO_LARGE,
        max_size: maxSize,
        provided_size: file_size,
      });
    }

    const bucket = config.s3.bucketPrivate;
    const keyPrefix = `mandats/${req.storefrontCustomer!.store_id}/${req.storefrontCustomer!.id}`;
    const uniqueId = pdId('file');
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
    const safeFilename = `${uniqueId}.${ext}`;
    const fileKey = `${keyPrefix}/${safeFilename}`;

    const isS3Local =
      config.s3.endpoint.includes('localhost') || config.s3.endpoint.includes('127.0.0.1');
    const host = req.get('host');
    const protocol = req.protocol;

    const uploadToken = signMockFileToken({
      type: 'mock_file_upload',
      bucket,
      key: fileKey,
      owner_id: req.storefrontCustomer!.id,
      store_id: req.storefrontCustomer!.store_id,
      purpose,
      max_size: maxSize,
      content_type,
    });

    const uploadUrl = isS3Local
      ? `${protocol}://${host}/api/pd/files/upload-s3-mock/${bucket}/${fileKey}?token=${uploadToken}`
      : await presignUpload({
          bucket,
          key: fileKey,
          contentType: content_type,
          expiresInSeconds: 900,
        });

    logger.info(
      { purpose, bucket, key: fileKey, storefront_customer_id: req.storefrontCustomer!.id },
      'Storefront presigned upload URL generated',
    );

    res.status(200).json({
      upload_url: uploadUrl,
      file_key: fileKey,
      max_size: maxSize,
      expires_in: 900,
    });
  }),
);

router.get(
  '/access',
  requireAuth,
  validate(fileAccessSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const key = String(req.query.key).replace(/^\/+/, '');
    const isAdmin = req.user!.role === UserRole.Admin || req.user!.role === UserRole.SuperAdmin;
    const allowedPrefixes = [
      `mandats/${req.user!.id}/`,
      `kyc/${req.user!.store_id ?? req.user!.id}/`,
      `delivery-proofs/${req.user!.store_id}/`,
    ];
    const adminAllowed = key.startsWith('kyc/') || key.startsWith('mandats/');
    const userAllowed = allowedPrefixes.some((prefix) => key.startsWith(prefix));
    const reportAllowed = await reportService.canAccessAttachmentKey(
      { id: req.user!.id, role: req.user!.role, store_id: req.user!.store_id },
      key,
    );
    const chatAllowed = await chatService.canAccessAttachmentKey(
      { id: req.user!.id, role: req.user!.role, store_id: req.user!.store_id },
      key,
    );

    if (
      key.includes('..') ||
      (!reportAllowed && !chatAllowed && ((!isAdmin && !userAllowed) || (isAdmin && !adminAllowed)))
    ) {
      throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'You cannot access this file');
    }

    const isS3Local =
      config.s3.endpoint.includes('localhost') || config.s3.endpoint.includes('127.0.0.1');
    const host = req.get('host');
    const protocol = req.protocol;

    const downloadToken = signMockFileToken({
      type: 'mock_file_download',
      bucket: config.s3.bucketPrivate,
      key,
      owner_id: req.user!.id,
      store_id: req.user!.store_id ?? null,
      purpose: 'file_access',
      max_size: 0,
      content_type: '*/*',
    });

    const downloadUrl = isS3Local
      ? `${protocol}://${host}/api/pd/files/download-s3-mock/${config.s3.bucketPrivate}/${key}?token=${downloadToken}`
      : await presignDownload({
          bucket: config.s3.bucketPrivate,
          key,
          expiresInSeconds: 900,
        });

    res.status(200).json({ download_url: downloadUrl, expires_in: 900 });
  }),
);

// S3 Upload Mock Route (Requires signed token, enabled only in dev/test)
mockFilesRouter.put(
  '/upload-s3-mock/:bucket/*',
  express.raw({ type: '*/*', limit: '110mb' }),
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined;
    if (!token) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Missing signed upload token');
    }
    const payload = verifyMockFileToken(token);
    if (payload.type !== 'mock_file_upload') {
      throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Token is not valid for file upload');
    }

    const bucket = req.params.bucket;
    const rawKey = req.params[0] || '';
    if (!bucket || !rawKey) {
      res.status(400).send('Bad Request');
      return;
    }
    const cleanKey = rawKey.replace(/^\/+/, '');

    if (payload.bucket !== bucket || payload.key !== cleanKey) {
      throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Token claims mismatch target bucket or key');
    }

    const fileBuffer = req.body as Buffer;
    const contentType = String(req.headers['content-type'] || 'application/octet-stream');

    const allowed = ALLOWED_TYPES[payload.purpose];
    if (allowed && !allowed.includes(contentType) && payload.content_type !== contentType && payload.content_type !== '*/*') {
      throw new PdValidationError('File type not allowed for this purpose', {
        code: PdErrorCode.FILE_INVALID_TYPE,
        valid_types: allowed,
        provided: contentType,
      });
    }

    const fileSize = fileBuffer ? fileBuffer.length : 0;
    if (payload.max_size > 0 && fileSize > payload.max_size) {
      throw new PdValidationError('File is too large for this purpose', {
        code: PdErrorCode.FILE_TOO_LARGE,
        max_size: payload.max_size,
        provided_size: fileSize,
      });
    }

    let filePath: string;
    try {
      filePath = resolveDataPath(bucket, cleanKey);
    } catch {
      res.status(400).send('Bad Request');
      return;
    }

    const blobKey = `${bucket}/${cleanKey}`;

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, fileBuffer);

    // Persist permanently in Supabase PostgreSQL database pd_file_blobs
    try {
      await query(
        `INSERT INTO pd_file_blobs (key, bucket, content_type, data)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE SET
           content_type = EXCLUDED.content_type,
           data = EXCLUDED.data,
           created_at = NOW()`,
        [blobKey, bucket, contentType, fileBuffer],
      );
    } catch (dbErr) {
      logger.error({ err: dbErr, blobKey }, 'Failed to persist upload blob to database');
    }

    logger.info({ bucket, key: cleanKey, path: filePath }, 'File uploaded and persisted to database');
    res.status(200).send('OK');
  }),
);

// S3 Download Mock Route (Requires signed token, exact match only, enabled only in dev/test)
mockFilesRouter.get(
  '/download-s3-mock/:bucket/*',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined;
    if (!token) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Missing signed download token');
    }
    const payload = verifyMockFileToken(token);
    if (payload.type !== 'mock_file_download') {
      throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Token is not valid for file download');
    }

    const bucket = req.params.bucket || 'pd-private';
    const rawKey = req.params[0] || '';
    if (!rawKey) {
      res.status(400).send('Bad Request');
      return;
    }
    const cleanKey = rawKey.replace(/^\/+/, '');

    if (payload.bucket !== bucket || payload.key !== cleanKey) {
      throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Token claims mismatch target bucket or key');
    }

    let filePath: string | null = null;
    try {
      filePath = resolveDataPath(bucket, cleanKey);
    } catch {
      filePath = null;
    }

    // 1. Check local disk
    if (filePath && fs.existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }

    // 2. Check PostgreSQL pd_file_blobs (EXACT MATCH ONLY: key1 or key2)
    const key1 = `${bucket}/${cleanKey}`;
    const key2 = cleanKey;

    try {
      const { rows } = await query<{ content_type: string; data: Buffer }>(
        `SELECT content_type, data FROM pd_file_blobs 
         WHERE key = $1 OR key = $2
         ORDER BY created_at DESC LIMIT 1`,
        [key1, key2],
      );
      if (rows.length > 0) {
        if (filePath) {
          try {
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, rows[0].data);
          } catch {}
        }
        res.setHeader('Content-Type', rows[0].content_type || 'image/jpeg');
        res.send(rows[0].data);
        return;
      }
    } catch (err) {
      logger.error({ err, key: cleanKey }, 'Failed to restore file from pd_file_blobs');
    }

    // 3. Fallback: Generate S3 presigned download URL if S3 is active
    try {
      const downloadUrl = await presignDownload({
        bucket,
        key: cleanKey,
        expiresInSeconds: 3600,
      });
      if (downloadUrl) {
        res.redirect(downloadUrl);
        return;
      }
    } catch (s3Err) {
      logger.warn({ err: s3Err, bucket, key: cleanKey }, 'S3 presignDownload fallback failed');
    }

    res.status(404).send('Not Found');
  }),
);

export default router;
