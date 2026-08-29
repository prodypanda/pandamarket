import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockUpload } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockUpload: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
}));

vi.mock('../services/storage.service', () => ({
  storageService: {
    upload: mockUpload,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { runBlobMigrationToR2 } from '../../scripts/migrate-blobs-to-r2';

describe('PLAN-T3-05: Database Bytea Blob to Cloudflare R2 Migration Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs dry-run mode without modifying records in database', async () => {
    // 1. Check table existence
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    // 2. Fetch first batch
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          key: 'pd-product-images/products/store_1/cover.jpg',
          bucket: 'pd-product-images',
          data: Buffer.from('fake-image-bytes'),
          content_type: 'image/jpeg',
          asset_id: 'asset_1',
          file_key: 'products/store_1/cover.jpg',
          filename: 'cover.jpg',
        },
      ],
    });

    const result = await runBlobMigrationToR2({ dryRun: true });
    expect(result.totalScanned).toBe(1);
    expect(result.totalMigrated).toBe(1);
    expect(result.dryRun).toBe(true);

    // Assert upload was NOT called in dry run
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('migrates batch of image blobs, uploads to R2 and purges database rows', async () => {
    // 1. Check table existence
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    // 2. Fetch batch
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          key: 'pd-product-images/products/store_1/photo.webp',
          bucket: 'pd-product-images',
          data: Buffer.from('fake-image-bytes'),
          content_type: 'image/webp',
          asset_id: 'asset_1',
          file_key: 'products/store_1/photo.webp',
          filename: 'photo.webp',
        },
      ],
    });
    // 3. Update pd_file_asset
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    // 4. Delete from pd_file_blobs
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    // 5. Next batch query (empty -> break)
    mockQuery.mockResolvedValueOnce({ rows: [] });

    mockUpload.mockResolvedValueOnce({
      url: 'https://cdn.pandamarket.tn/products/store_1/photo.webp',
    });

    const result = await runBlobMigrationToR2({ dryRun: false });
    expect(result.totalMigrated).toBe(1);
    expect(result.totalErrors).toBe(0);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'products/store_1/photo.webp',
        mimeType: 'image/webp',
      }),
    );
  });
});
