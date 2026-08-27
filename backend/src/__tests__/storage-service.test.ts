import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '../services/storage.service';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://test-account.r2.cloudflarestorage.com/pandamarket/products/img.webp?X-Amz-Signature=test'),
}));

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: vi.fn().mockImplementation((args) => args),
    DeleteObjectCommand: vi.fn().mockImplementation((args) => args),
  };
});

describe('PLAN-M-02: Cloudflare R2 / S3 Object Storage Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes Cloudflare R2 storage service with custom credentials and account endpoint', async () => {
    const service = new StorageService({
      r2AccountId: 'acc_123456789',
      r2AccessKeyId: 'key_abc',
      r2SecretAccessKey: 'sec_xyz',
      r2Bucket: 'pandamarket-prod',
      cdnBaseUrl: 'https://cdn.pandamarket.tn',
    });

    expect(service.isConfigured()).toBe(true);

    const presignedUrl = await service.getPresignedUploadUrl('products/vase-1.webp', 'image/webp');
    expect(presignedUrl).toContain('https://test-account.r2.cloudflarestorage.com');

    const publicUrl = service.getPublicUrl('products/vase-1.webp');
    expect(publicUrl).toBe('https://cdn.pandamarket.tn/products/vase-1.webp');
  });

  it('handles buffer upload and delete operations', async () => {
    const service = new StorageService({
      r2AccountId: 'acc_123',
      r2AccessKeyId: 'key_123',
      r2SecretAccessKey: 'sec_123',
    });

    const uploadRes = await service.uploadBuffer('branding/logo.png', Buffer.from('test-image'), 'image/png');
    expect(uploadRes.success).toBe(true);
    expect(uploadRes.key).toBe('branding/logo.png');

    const deleteRes = await service.deleteObject('branding/logo.png');
    expect(deleteRes).toBe(true);
  });

  it('throws descriptive error when storage is not configured', async () => {
    const service = new StorageService({
      r2AccountId: '',
      r2AccessKeyId: '',
      r2SecretAccessKey: '',
      s3Endpoint: '',
    });

    expect(service.isConfigured()).toBe(false);
    await expect(service.getPresignedUploadUrl('test.png', 'image/png')).rejects.toThrow(
      /Cloud storage \(S3\/R2\) is not configured/,
    );
  });
});
