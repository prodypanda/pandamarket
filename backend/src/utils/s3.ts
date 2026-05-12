/**
 * S3-compatible storage client (MinIO local, Cloudflare R2/AWS S3 in prod).
 * Handles file uploads, presigned URL generation (PUT and GET).
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from './logger';
import { PdInternalError } from '../errors';
import { PdErrorCode } from '@pandamarket/types';

let client: S3Client | null = null;

export function getS3(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
    });
    logger.info({ endpoint: config.s3.endpoint }, 'S3 client initialised');
  }
  return client;
}

/**
 * Generate a presigned URL for a PUT (upload) operation.
 * Used for direct browser → S3 uploads (KYC docs, mandat proofs).
 */
export async function presignUpload(opts: {
  bucket: string;
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: opts.bucket,
      Key: opts.key,
      ContentType: opts.contentType,
    });
    return await getSignedUrl(getS3(), command, {
      expiresIn: opts.expiresInSeconds ?? 900, // 15 min default
    });
  } catch (err) {
    logger.error({ err, opts }, 'Failed to presign upload URL');
    throw new PdInternalError('Failed to generate upload URL', { code: PdErrorCode.FILE_PRESIGN_FAILED });
  }
}

/**
 * Generate a presigned URL for a GET (download) operation.
 * Used for private files (digital products, KYC docs) where we need
 * to grant temporary access.
 */
export async function presignDownload(opts: {
  bucket: string;
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  try {
    const command = new GetObjectCommand({ Bucket: opts.bucket, Key: opts.key });
    return await getSignedUrl(getS3(), command, {
      expiresIn: opts.expiresInSeconds ?? 3600, // 1 hour default
    });
  } catch (err) {
    logger.error({ err, opts }, 'Failed to presign download URL');
    throw new PdInternalError('Failed to generate download URL', { code: PdErrorCode.FILE_PRESIGN_FAILED });
  }
}

/**
 * Build the public URL for a public-bucket asset.
 */
export function publicUrl(key: string): string {
  if (config.s3.publicBaseUrl === '/pd-product-images') {
    return `/pd-product-images/${key.replace(/^\//, '')}`;
  }
  return `${config.s3.publicBaseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
}
