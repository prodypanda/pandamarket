# Engineering Specification: PLAN-T3-05
## Database Bytea Blob to Cloudflare R2 Migration Script & Table Cleanup

- **Target Task:** [T3-05](../../00-MASTER-CHECKLIST/TIER-3-ARCHITECTURE-DEBT.md)
- **Severity:** 🟢 Database Optimization & Backup Speed
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** PostgreSQL Database Storage, Cloudflare R2 Bucket.

---

### 1. Summary & Business Impact
547 image blobs (34 MB) reside in `pd_file_blobs` as binary data, bloating database backups and memory consumption. This plan provides an idempotent Node.js ETL migration script that uploads blobs to Cloudflare R2, verifies MD5 checksums, updates `pd_file_asset.url`, and safely drops the binary bytea rows.

---

### 2. Implementation Details
1. Script: `scripts/migrate-blobs-to-r2.ts`.
2. Query rows in batches of 50: `SELECT id, asset_id, data, mime_type FROM pd_file_blobs ORDER BY id`.
3. Upload to R2: `PutObjectCommand({ Bucket, Key: asset.key, Body: row.data, ContentType })`.
4. Update `pd_file_asset SET url = cdn_url, storage_provider = 'r2'`.
5. Nullify or drop migrated rows from `pd_file_blobs`.

---

### 3. Verification Plan
```bash
npx ts-node scripts/migrate-blobs-to-r2.ts --dry-run
```
