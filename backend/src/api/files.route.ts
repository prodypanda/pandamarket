/**
 * File upload routes — presigned URL generation for S3/MinIO.
 *
 * Clients upload directly to S3 using the presigned URL (never through the backend).
 * This endpoint generates the URL with proper bucket routing, path structure,
 * and content-type/size validation.
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, requireAuth, validate } from '../middlewares';
import { presignUploadSchema } from '../validators';
import { presignUpload, publicUrl } from '../utils/s3';
import { config } from '../config';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { PdValidationError, PdErrorCode, PdForbiddenError } from '../errors';
import { fileAssetService } from '../services/file-asset.service';
import { UserRole } from '@pandamarket/types';

const router = Router();

// Upload rate limit: 10 uploads per 5 minutes per user
const uploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown',
  message: { error: { code: PdErrorCode.RATE_LIMITED, message: 'Too many upload requests. Please wait before uploading more files.' } },
});

// Allowed MIME types per purpose
const ALLOWED_TYPES: Record<string, string[]> = {
  product_image: ['image/jpeg', 'image/png', 'image/webp'],
  kyc_document: ['image/jpeg', 'image/png', 'application/pdf'],
  mandat_proof: ['image/jpeg', 'image/png'],
  theme_asset: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  marketplace_asset: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'],
};

// Max file sizes per purpose (bytes)
const MAX_SIZES: Record<string, number> = {
  product_image: 10 * 1024 * 1024,   // 10 MB
  kyc_document: 10 * 1024 * 1024,    // 10 MB
  mandat_proof: 10 * 1024 * 1024,    // 10 MB
  theme_asset: 5 * 1024 * 1024,      // 5 MB
  marketplace_asset: 25 * 1024 * 1024,
};

/**
 * POST /api/pd/files/presign
 *
 * Body: { filename, content_type, purpose }
 * Returns: { upload_url, file_key, public_url? }
 */
router.post(
  '/presign',
  requireAuth,
  uploadRateLimit,
  validate(presignUploadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { filename, content_type, purpose, file_size } = req.body;

    // Validate content type for the given purpose
    const allowed = ALLOWED_TYPES[purpose];
    if (!allowed || !allowed.includes(content_type)) {
      throw new PdValidationError('File type not allowed for this purpose', {
        code: PdErrorCode.FILE_INVALID_TYPE,
        valid_types: allowed,
        provided: content_type,
      });
    }

    if (file_size !== undefined && file_size > MAX_SIZES[purpose]) {
      throw new PdValidationError('File is too large for this purpose', {
        code: PdErrorCode.FILE_TOO_LARGE,
        max_size: MAX_SIZES[purpose],
        provided_size: file_size,
      });
    }

    if (
      purpose === 'marketplace_asset' &&
      req.user!.role !== UserRole.Admin &&
      req.user!.role !== UserRole.SuperAdmin
    ) {
      throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Only admins can upload marketplace assets');
    }

    // Determine bucket and key path
    let bucket: string;
    let keyPrefix: string;
    const uniqueId = pdId('file');
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
    const safeFilename = `${uniqueId}.${ext}`;

    switch (purpose) {
      case 'product_image':
        bucket = config.s3.bucketPublic;
        keyPrefix = `products/${req.user!.store_id ?? req.user!.id}`;
        break;
      case 'kyc_document':
        bucket = config.s3.bucketPrivate;
        keyPrefix = `kyc/${req.user!.store_id ?? req.user!.id}`;
        break;
      case 'mandat_proof':
        bucket = config.s3.bucketPrivate;
        keyPrefix = `mandats/${req.user!.id}`;
        break;
      case 'theme_asset':
        bucket = config.s3.bucketThemes;
        keyPrefix = `themes/${req.user!.store_id ?? req.user!.id}`;
        break;
      case 'marketplace_asset':
        bucket = config.s3.bucketPublic;
        keyPrefix = `marketplace/${req.user!.id}`;
        break;
      default:
        throw new PdValidationError('Invalid purpose');
    }

    const fileKey = `${keyPrefix}/${safeFilename}`;

    const uploadUrl = await presignUpload({
      bucket,
      key: fileKey,
      contentType: content_type,
      expiresInSeconds: 900, // 15 minutes
    });

    // For public bucket, also return the public URL
    const isPublic = bucket === config.s3.bucketPublic;

    logger.info(
      { purpose, bucket, key: fileKey, user_id: req.user!.id },
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
        store_id: purpose === 'marketplace_asset' ? null : req.user!.store_id ?? null,
      })
      : null;

    res.status(200).json({
      upload_url: uploadUrl,
      file_key: fileKey,
      public_url: publicAssetUrl,
      asset,
      max_size: MAX_SIZES[purpose],
      expires_in: 900,
    });
  }),
);

export default router;
