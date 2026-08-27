# 01 — Cloudflare R2 Migration Blueprint & Architecture

## 1. Cloudflare R2 Migration Rationale

PandaMarket is architected to transition from temporary local MinIO storage to **Cloudflare R2 Object Storage**:
- **Zero Egress Fees:** Cloudflare R2 charges \$0.00 for outbound bandwidth egress (compared to high AWS S3 egress costs).
- **S3-Compatible API:** Fully compatible with `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- **Global Edge Performance:** Assets served through Cloudflare CDN (`cdn.pandamarket.tn`) with edge caching across 300+ global data centers.

---

## 2. Storage Service Implementation Analysis

The codebase in [`backend/src/services/storage.service.ts`](file:///c:/tek/pandamarket/backend/src/services/storage.service.ts) is already built with native R2 support:

```typescript
// backend/src/services/storage.service.ts
const r2AccountId = opts?.r2AccountId ?? config.storage?.r2AccountId ?? process.env.PD_R2_ACCOUNT_ID ?? '';
const customEndpoint = opts?.s3Endpoint ?? (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : config.s3?.endpoint);
const region = opts?.s3Region ?? (r2AccountId ? 'auto' : 'us-east-1');

this.s3 = new S3Client({
  region,
  endpoint: customEndpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: !r2AccountId,
});
```

---

## 3. Step-by-Step R2 Activation How-To

1. **Create Cloudflare R2 Bucket:**
   - Bucket Name: `pandamarket-production`
   - Primary Region: `Automatic` / `WEUR` (Western Europe closest to Tunisia).
2. **Configure Custom CDN Domain:**
   - Bind `cdn.pandamarket.tn` to the R2 bucket in Cloudflare Dashboard.
   - Set Caching Rule: `Cache-Control: public, max-age=31536000, immutable` for static product images.
3. **Update Environment Secrets:**
   ```bash
   PD_R2_ACCOUNT_ID="<your-cloudflare-account-id>"
   PD_R2_ACCESS_KEY_ID="<your-r2-access-key>"
   PD_R2_SECRET_ACCESS_KEY="<your-r2-secret-key>"
   PD_R2_BUCKET="pandamarket-production"
   PD_CDN_BASE_URL="https://cdn.pandamarket.tn"
   ```
4. **Deploy:** Restart backend service. The application will instantly generate presigned upload URLs against R2 and serve assets via `https://cdn.pandamarket.tn/*`.

---

## 4. Storage Checklist

- [x] S3/R2 client abstraction implemented in `StorageService`.
- [x] Presigned upload URLs with 15-minute expiration.
- [x] Fallback database blob restore table (`pd_file_blobs`).
- [ ] Provision live Cloudflare R2 bucket and configure `cdn.pandamarket.tn`.
