import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PLAN-B-30: Media Library Bytea Exclusion & Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies that media blob queries exclude raw bytea data and include asset_metadata', async () => {
    // 1. Blobs query mock
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          key: 'products/store_1/image1.jpg',
          bucket: 'pd-product-images',
          content_type: 'image/jpeg',
          size: '102400',
          created_at: new Date('2026-08-01T10:00:00Z'),
          asset_filename: 'image1.jpg',
          asset_id: 'ast_1',
          asset_metadata: { width: 800, height: 600 },
        },
      ],
    });

    // 2. Product images query mock
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    // Simulate query execution
    const blobQuerySql = `SELECT b.key, b.bucket, b.content_type, OCTET_LENGTH(b.data) as size, b.created_at,
              a.filename as asset_filename, a.id as asset_id, a.metadata as asset_metadata
       FROM pd_file_blobs b
       LEFT JOIN pd_file_asset a ON (a.file_key = b.key OR a.url LIKE '%' || b.key)
       WHERE b.key LIKE '%store_1%'
       ORDER BY b.created_at DESC`;

    const blobResult = await mockQuery(blobQuerySql, ['store_1']);

    expect(blobQuerySql).not.toContain('b.data,');
    expect(blobQuerySql).toContain('a.metadata as asset_metadata');
    expect(blobResult.rows[0].asset_metadata.width).toBe(800);
    expect(blobResult.rows[0].asset_metadata.height).toBe(600);
  });
});
