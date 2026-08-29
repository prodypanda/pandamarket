# Project: PandaMarket Automated Image Compression & Multi-Size WebP Cloudflare R2 Pipeline

## Architecture
PandaMarket uses a multi-tier, high-performance image processing, storage, and distribution architecture:
1. **Master Upload Layer**: Direct browser-to-Cloudflare R2 presigned upload (`/api/pd/files/presign`) or local S3 mock endpoint (`/api/pd/files/upload-s3-mock/:bucket/*`), registering asset records in `pd_file_asset`.
2. **Asynchronous Processing Layer**: BullMQ queue (`pd_image_queue`) and worker (`backend/src/workers/image.worker.ts`), triggered post-upload (`/api/pd/files/process-variants`) or on product save/update.
3. **Sharp Processing Engine (`backend/src/services/image-variant.service.ts`)**: Generates 4 WebP variants (`thumbnail` 150x150 cover, `small` 300x300 fit, `medium` 600x600 fit, `large` 1200x1200 fit) with dynamic quality from `image_quality_webp` platform settings.
4. **Multi-Tier Persistence & Distribution Layer**:
   - Cloudflare R2 Object Storage (`pandamarket` bucket) with `ContentType: image/webp` and `Cache-Control: public, max-age=31536000, immutable`.
   - CDN Edge (`https://cdn.garbage.team` / `https://cdn.pandamarket.tn`).
   - Database Blobs fallback (`pd_file_blobs`).
   - Local disk cache (`resolveDataPath`).
5. **Dynamic On-The-Fly & Edge Fallback**: `imageVariantService.getOrGenerateVariantOnTheFly` with single-flight request deduplication prevents 404s when ungenerated variants are requested.
6. **Frontend & Storefront Distribution**: `frontend/src/lib/image-url.ts` resolves CDN/R2 WebP variants (`_thumbnail.webp`, `_small.webp`, `_medium.webp`, `_large.webp`), powering 18 theme storefronts, product galleries, hero banners, and dashboard components.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Multi-Size WebP Variant Generation | Sharp generates 4 WebP variants (`thumbnail` 150x150 cover, `small` 300x300 inside, `medium` 600x600 inside, `large` 1200x1200 inside) adhering to platform settings (`image_quality_webp`, dimensions, crop modes). | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Direct Cloudflare R2 Sync | Upload generated WebP variants directly to Cloudflare R2 (`pandamarket`) with `ContentType: image/webp`, `Cache-Control: public, max-age=31536000, immutable`, and CDN URLs (`https://cdn.garbage.team/...`). | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Metadata & DB Persistence | Persist variants and metadata into `pd_file_blobs` and `pd_file_asset` JSONB metadata. | M1 | ORIGINAL_REQUEST §R1, R2 |
| 4 | BullMQ Async Processing Queue & Worker | Create `pd_image_queue` (`imageQueue`) and `image.worker.ts` with exponential backoff and dual runtime support (`main.ts` & `worker.ts`). | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Post-Upload Processing Triggers | Automatic trigger on presigned upload completion (`POST /api/pd/files/process-variants`) and product save/update hooks. | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Dynamic On-The-Fly Generation & Edge Fallback | Dynamic handler (`getOrGenerateVariantOnTheFly`) and single-flight concurrency lock in Express middleware to serve requested variants with HTTP 200 without 404s. | M3 | ORIGINAL_REQUEST §R3 |
| 7 | Frontend Multi-Size WebP URL Resolution | Update `getResizedImageUrl` in `frontend/src/lib/image-url.ts` to generate CDN/R2 WebP variants while preserving non-resizable asset exclusions. | M4 | ORIGINAL_REQUEST §R4 |
| 8 | Storefront Themes & UI Component Integration | Update `frontend/src/components/themes/shared.ts` (18 themes) and storefront/dashboard image consumers to render exact WebP variant sizes. | M4 | ORIGINAL_REQUEST §R4 |
| 9 | Comprehensive Test Suite & Regression Safety | Unit, integration, and E2E test suites for backend image pipeline, BullMQ workers, R2 uploads, frontend URL resolution, and regression protection. | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Multi-Size WebP Variant Generation & Cloudflare R2 Sync | Core Sharp WebP generation (4 presets), R2 upload with WebP content-type & immutable cache-control headers, platform settings integration (`image_quality_webp`), DB persistence (`pd_file_blobs`, `pd_file_asset`). | none | PLANNED |
| M2 | Asynchronous Post-Upload Trigger & BullMQ Worker | `pd_image_queue`, `image.worker.ts`, integration into `main.ts` and `worker.ts`, post-upload endpoint `/api/pd/files/process-variants`, and product image update hooks. | M1 | PLANNED |
| M3 | Dynamic On-The-Fly Generation & Edge Fallback Handler | Express static fallback middleware in `main.ts`, `imageVariantService.getOrGenerateVariantOnTheFly`, single-flight promise deduplication for concurrent requests, zero 404 guarantee. | M1 | PLANNED |
| M4 | Frontend Multi-Size WebP Integration & Storefront Parity | `frontend/src/lib/image-url.ts`, `frontend/src/components/themes/shared.ts` (18 themes), product cards, gallery, hero banners, cart, and dashboard views. | M1, M3 | PLANNED |
| M5 | Comprehensive Test Verification, Challenger Testing & Forensic Audit | Backend Vitest suite, frontend Vitest suite, Challenger stress testing, and Forensic integrity audit. | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### 1. `ImageVariantService` Interface (`backend/src/services/image-variant.service.ts`)
```typescript
export interface ImageVariantPreset {
  name: 'thumbnail' | 'small' | 'medium' | 'large';
  width: number;
  height: number;
  crop: 'cover' | 'inside';
  quality?: number;
}

export interface GeneratedVariant {
  name: 'thumbnail' | 'small' | 'medium' | 'large';
  key: string;
  url: string;
  width: number;
  height: number;
  size: number;
  format: 'webp';
  buffer?: Buffer;
}

export interface ImageVariantService {
  getPresetConfigs(): Promise<Record<string, ImageVariantPreset>>;
  generateVariantsForBuffer(buffer: Buffer, bucket: string, rawKey: string): Promise<GeneratedVariant[]>;
  generateVariantsFromR2(bucket: string, fileKey: string): Promise<GeneratedVariant[]>;
  generateVariantsForFileKey(rawKey: string, bucket?: string): Promise<GeneratedVariant[]>;
  getOrGenerateVariantOnTheFly(bucket: string, requestedKey: string): Promise<{ buffer: Buffer; contentType: string } | null>;
}
```

### 2. BullMQ Image Queue Interface (`backend/src/queues/image-queue.ts`)
```typescript
export interface ImageProcessingJobData {
  fileKey: string;
  bucket?: string;
  storeId?: string;
  userId?: string;
  purpose?: string;
}

export const imageQueue: Queue<ImageProcessingJobData>;
export function enqueueImageVariantGeneration(data: ImageProcessingJobData): Promise<Job<ImageProcessingJobData>>;
```

### 3. Post-Upload API Contract (`POST /api/pd/files/process-variants`)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "file_key": "products/store_123/file_abc.jpg",
    "bucket": "pandamarket"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "ok": true,
    "enqueued": true,
    "file_key": "products/store_123/file_abc.jpg",
    "variants": [
      { "name": "thumbnail", "key": "products/store_123/file_abc_thumbnail.webp", "url": "https://cdn.garbage.team/products/store_123/file_abc_thumbnail.webp" },
      { "name": "small", "key": "products/store_123/file_abc_small.webp", "url": "https://cdn.garbage.team/products/store_123/file_abc_small.webp" },
      { "name": "medium", "key": "products/store_123/file_abc_medium.webp", "url": "https://cdn.garbage.team/products/store_123/file_abc_medium.webp" },
      { "name": "large", "key": "products/store_123/file_abc_large.webp", "url": "https://cdn.garbage.team/products/store_123/file_abc_large.webp" }
    ]
  }
  ```

### 4. Frontend Image URL Helper Contract (`frontend/src/lib/image-url.ts`)
```typescript
export type ImageVariantSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

export function getResizedImageUrl(
  url: string | null | undefined,
  size: ImageVariantSize = 'medium',
  fallback: string = '/placeholder.svg'
): string;
```

---

## Code Layout & Write Ownership
- **Milestone 1**:
  - `backend/src/services/image-variant.service.ts`
  - `backend/src/services/storage.service.ts`
  - `backend/src/services/platform-config.service.ts`
  - `backend/src/api/admin/settings.routes.ts`
- **Milestone 2**:
  - `backend/src/queues/image-queue.ts`
  - `backend/src/workers/image.worker.ts`
  - `backend/src/main.ts`
  - `backend/src/worker.ts`
  - `backend/src/api/files.route.ts`
  - `backend/src/services/product.service.ts`
- **Milestone 3**:
  - `backend/src/services/image-variant.service.ts` (concurrency deduplication & on-the-fly generation)
  - `backend/src/main.ts` (express dynamic fallback middleware)
- **Milestone 4**:
  - `frontend/src/lib/image-url.ts`
  - `frontend/src/components/themes/shared.ts`
  - `frontend/src/components/store/ProductCard.tsx`
  - `frontend/src/components/product/ProductGallery.tsx`
- **Milestone 5**:
  - `backend/src/__tests__/image-variant.service.test.ts`
  - `backend/src/__tests__/image-queue.test.ts`
  - `frontend/src/__tests__/image-url.test.ts`
