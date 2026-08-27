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
      id: string;
      asset_id: string;
      data: Buffer;
      mime_type: string;
      file_name: string;
    }>(
      `SELECT b.id, b.asset_id, b.data, COALESCE(b.mime_type, 'image/jpeg') AS mime_type, COALESCE(a.file_name, 'asset.jpg') AS file_name
       FROM pd_file_blobs b
       LEFT JOIN pd_file_asset a ON a.id = b.asset_id
       ORDER BY b.id ASC
       LIMIT $1`,
      [batchSize],
    );

    if (batch.length === 0) break;
    totalScanned += batch.length;

    for (const row of batch) {
      try {
        const fileBuffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
        const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
        const key = `migrated/${row.asset_id || row.id}/${row.file_name}`;

        if (!dryRun) {
          // Upload to R2
          const uploadResult = await storageService.upload({
            file: fileBuffer,
            key,
            mimeType: row.mime_type,
            acl: 'public-read',
          });

          // Update asset record
          if (row.asset_id) {
            await query(
              `UPDATE pd_file_asset
               SET url = $1,
                   storage_provider = 'r2',
                   updated_at = NOW()
               WHERE id = $2`,
              [uploadResult.url, row.asset_id],
            );
          }

          // Purge migrated blob row
          await query(`DELETE FROM pd_file_blobs WHERE id = $1`, [row.id]);
        }

        totalMigrated++;
        logger.debug({ id: row.id, asset_id: row.asset_id, checksum }, 'Migrated blob to R2');
      } catch (err) {
        totalErrors++;
        logger.error({ err, id: row.id }, 'Failed to migrate blob row');
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
