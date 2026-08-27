# Engineering Specification: PLAN-M-02
## S3-Compatible Storage Adapter Designed for Cloudflare R2

- **Target PRD Gap:** [M-02](../../04-MISSING-WORK-PRD/M-01-TO-M-06-CORE-COMMERCE.md#m-02)
- **Severity:** 🟡 PRD Gap / Database Bloat Remediation
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** File Storage Service, Upload Handlers, Database Performance.

---

### 1. Summary & Business Impact
547 image blobs (34 MB) are currently stored in PostgreSQL `pd_file_blobs` as binary `bytea`. Querying media reads raw binary into server memory, saturating memory on small Render instances. Cloudflare R2 provides S3-compatible, zero-egress-cost object storage. This plan builds an S3-compatible adapter that works seamlessly with AWS S3, MinIO, or Cloudflare R2, with a background migration script to move existing blobs out of PostgreSQL.

---

### 2. Technical Architecture & Flow
1. **S3 Client Configuration:** Uses `@aws-sdk/client-s3` configured with custom `endpoint` pointing to Cloudflare R2 (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
2. **Presigned Upload URLs:** Direct client-to-R2 uploads for products, store assets, and review media via `PutObjectCommand`.
3. **Public CDN URL:** Files are served through a custom domain or Cloudflare Public Bucket URL.
4. **Fallback Mode:** If `R2_BUCKET` is not set, files fall back gracefully to the current database storage adapter.

---

### 3. Implementation Details

#### Install AWS SDK v3
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner -w backend
```

#### Storage Provider Interface (`backend/src/services/storage.service.ts`)
```ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';

export class StorageService {
  private s3: S3Client | null = null;

  constructor() {
    if (config.storage.r2AccountId && config.storage.r2AccessKeyId) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${config.storage.r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.storage.r2AccessKeyId,
          secretAccessKey: config.storage.r2SecretAccessKey,
        },
      });
    }
  }

  async getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
    if (!this.s3) throw new Error('Cloud storage not configured');
    const command = new PutObjectCommand({
      Bucket: config.storage.r2Bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 900 });
  }

  getPublicUrl(key: string): string {
    return `${config.storage.cdnBaseUrl}/${key}`;
  }
}
```

---

### 4. Verification Plan
```bash
npm run test -w backend -- src/__tests__/storage-service.test.ts
```
