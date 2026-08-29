import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface StorageConfigOptions {
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2Bucket?: string;
  cdnBaseUrl?: string;
  s3Endpoint?: string;
  s3Region?: string;
}

export class StorageService {
  private s3: S3Client | null = null;
  private bucket: string;
  private cdnBaseUrl: string;

  constructor(opts?: StorageConfigOptions) {
    const r2AccountId = opts?.r2AccountId ?? config.storage?.r2AccountId ?? process.env.PD_R2_ACCOUNT_ID ?? '';
    const accessKeyId = opts?.r2AccessKeyId ?? config.storage?.r2AccessKeyId ?? config.s3?.accessKey ?? process.env.PD_R2_ACCESS_KEY_ID ?? '';
    const secretAccessKey = opts?.r2SecretAccessKey ?? config.storage?.r2SecretAccessKey ?? config.s3?.secretKey ?? process.env.PD_R2_SECRET_ACCESS_KEY ?? '';
    const customEndpoint = opts?.s3Endpoint ?? config.storage?.s3Endpoint ?? (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : config.s3?.endpoint);
    const region = opts?.s3Region ?? config.storage?.s3Region ?? (r2AccountId ? 'auto' : config.s3?.region ?? 'us-east-1');

    this.bucket = opts?.r2Bucket ?? config.storage?.r2Bucket ?? config.s3?.bucketPublic ?? 'pandamarket';
    this.cdnBaseUrl = opts?.cdnBaseUrl ?? process.env.PD_CDN_BASE_URL ?? config.storage?.cdnBaseUrl ?? 'https://cdn.garbage.team';

    if (accessKeyId && secretAccessKey && (customEndpoint || r2AccountId)) {
      this.s3 = new S3Client({
        region,
        endpoint: customEndpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: !r2AccountId,
      });
      logger.info({ endpoint: customEndpoint, bucket: this.bucket }, '[StorageService] S3/R2 client initialized');
    }
  }

  isConfigured(): boolean {
    return this.s3 !== null;
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<string> {
    if (!this.s3) {
      throw new Error('Cloud storage (S3/R2) is not configured');
    }

    const cleanKey = key.replace(/^\/+/, '').replace(/^pd-product-images\//, '');
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: cleanKey,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async uploadBuffer(
    key: string,
    data: Buffer,
    contentType: string = 'image/webp',
    cacheControl?: string,
  ): Promise<{ success: boolean; url: string; key: string }> {
    if (!this.s3) {
      throw new Error('Cloud storage (S3/R2) is not configured');
    }

    const cleanKey = key.replace(/^\/+/, '').replace(/^pd-product-images\//, '');
    const isWebp = contentType === 'image/webp' || cleanKey.endsWith('.webp');
    const finalContentType = contentType || (isWebp ? 'image/webp' : 'application/octet-stream');
    const defaultCacheControl = isWebp || cleanKey.includes('_')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=86400';
    const finalCacheControl = cacheControl || defaultCacheControl;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
        Body: data,
        ContentType: finalContentType,
        CacheControl: finalCacheControl,
      }),
    );

    return {
      success: true,
      url: this.getPublicUrl(cleanKey),
      key: cleanKey,
    };
  }

  async upload(opts: {
    file: Buffer;
    key: string;
    mimeType?: string;
    contentType?: string;
    acl?: string;
    cacheControl?: string;
  }): Promise<{ success: boolean; url: string; key: string }> {
    return this.uploadBuffer(
      opts.key,
      opts.file,
      opts.contentType || opts.mimeType || 'image/webp',
      opts.cacheControl,
    );
  }

  async deleteObject(key: string): Promise<boolean> {
    if (!this.s3) {
      return false;
    }

    const cleanKey = key.replace(/^\/+/, '').replace(/^pd-product-images\//, '');
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      }),
    );
    return true;
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '').replace(/^pd-product-images\//, '');
    return `${this.cdnBaseUrl.replace(/\/+$/, '')}/${cleanKey}`;
  }
}

export const storageService = new StorageService();
