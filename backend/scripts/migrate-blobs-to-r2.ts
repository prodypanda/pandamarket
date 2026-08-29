/**
 * Database Bytea Blob to Cloudflare R2 Migration Script — PLAN-T3-05
 *
 * Idempotently extracts binary image blobs from PostgreSQL `pd_file_blobs`,
 * streams them to Cloudflare R2 / S3 Object Storage, updates `pd_file_asset` URLs,
 * and purges bytea payloads to reduce database disk size and backup duration.
 */

import { query } from '../src/db/pool';
import { storageService } from '../src/services/storage.service';
import { logger } from '../src/utils/logger';
import crypto from 'crypto';

export interface BlobMigrationResult {
  totalScanned: number;
  totalMigrated: number;
  totalErrors: number;
  dryRun: boolean;
}

export async function runBlobMigrationToR2(options: { dryRun?: boolean; batchSize?: number } = {}): Promise<BlobMigrationResult> {
  const dryRun = options.dryRun ?? false;
  const batchSize = options.batchSize ?? 50;

  logger.info({ dryRun, batchSize }, 'Starting bytea blob migration to Cloudflare R2...');

  let totalScanned = 0;
  let totalMigrated = 0;
  let totalErrors = 0;

  // Check if pd_file_blobs table exists
  const { rows: tableCheck } = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'pd_file_blobs'`,
  );

  if (tableCheck.length === 0) {
    logger.info('pd_file_blobs table does not exist or has already been pruned. Migration complete.');
    return { totalScanned: 0, totalMigrated: 0, totalErrors: 0, dryRun };
  }

  while (true) {
    const { rows: batch } = await query<{
      key: string;
      bucket: string;
      data: Buffer;
      content_type: string;
      asset_id: string | null;
      file_key: string | null;
      filename: string | null;
    }>(
      `SELECT b.key, b.bucket, b.data, COALESCE(b.content_type, 'image/jpeg') AS content_type,
              a.id AS asset_id, a.file_key, COALESCE(a.filename, 'asset.jpg') AS filename
       FROM pd_file_blobs b
       LEFT JOIN pd_file_asset a ON (a.file_key = b.key OR a.file_key = REPLACE(b.key, b.bucket || '/', '') OR a.url LIKE '%' || b.key)
       ORDER BY b.key ASC
       LIMIT $1`,
      [batchSize],
    );

    if (batch.length === 0) break;
    totalScanned += batch.length;

    for (const row of batch) {
      try {
        const fileBuffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
        const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
        const cleanKey = row.key.replace(/^(pd-product-images|pd-private-files|pd-themes|pandamarket)\//, '');
        const targetKey = row.file_key || cleanKey || `migrated/${row.asset_id || checksum}/${row.filename}`;

        if (!dryRun) {
          // Upload to R2
          const uploadResult = await storageService.upload({
            file: fileBuffer,
            key: targetKey,
            mimeType: row.content_type,
            contentType: row.content_type,
            acl: 'public-read',
          });

          // Update asset record
          if (row.asset_id || row.file_key) {
            await query(
              `UPDATE pd_file_asset
               SET url = $1,
                   updated_at = NOW()
               WHERE id = $2 OR file_key = $3`,
              [uploadResult.url, row.asset_id, row.file_key || targetKey],
            );
          }

          // Purge migrated blob row
          await query(`DELETE FROM pd_file_blobs WHERE key = $1`, [row.key]);
        }

        totalMigrated++;
        logger.debug({ key: row.key, asset_id: row.asset_id, checksum }, 'Migrated blob to R2');
      } catch (err) {
        totalErrors++;
        logger.error({ err, key: row.key }, 'Failed to migrate blob row');
      }
    }

    if (dryRun) break; // In dry run, process first batch only
  }

  logger.info(
    { totalScanned, totalMigrated, totalErrors, dryRun },
    'Blob to Cloudflare R2 migration finished.',
  );

  return { totalScanned, totalMigrated, totalErrors, dryRun };
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  runBlobMigrationToR2({ dryRun: isDryRun })
    .then((res) => {
      console.log('Migration finished:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
