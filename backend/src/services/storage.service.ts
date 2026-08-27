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
    this.cdnBaseUrl = opts?.cdnBaseUrl ?? config.storage?.cdnBaseUrl ?? 'https://cdn.pandamarket.tn';

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

    const cleanKey = key.replace(/^\/+/, '');
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
    contentType: string,
  ): Promise<{ success: boolean; url: string; key: string }> {
    if (!this.s3) {
      throw new Error('Cloud storage (S3/R2) is not configured');
    }

    const cleanKey = key.replace(/^\/+/, '');
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
        Body: data,
        ContentType: contentType,
      }),
    );

    return {
      success: true,
      url: this.getPublicUrl(cleanKey),
      key: cleanKey,
    };
  }

  async deleteObject(key: string): Promise<boolean> {
    if (!this.s3) {
      return false;
    }

    const cleanKey = key.replace(/^\/+/, '');
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      }),
    );
    return true;
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.cdnBaseUrl.replace(/\/+$/, '')}/${cleanKey}`;
  }
}

export const storageService = new StorageService();
