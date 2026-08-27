# Engineering Specification: PLAN-B-30
## Paginate `/me/media` & Persist Dimensions on Upload to Eliminate Sharp Loop

- **Target Bug:** [B-30](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-27-TO-B-33-FRONTEND-DATA.md#b-30)
- **Severity:** 🟠 P1 (High Server Latency / Sharp CPU Saturation)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Media Library API, Sharp Image Processor.

---

### 1. Summary & Business Impact
In `store.route.ts:579-760`, the backend selects every image blob in `pd_file_blobs` (including the raw binary bytea column), loops over every row, and calls `await sharp(row.data).metadata()`. With 547 blobs (34 MB), opening the media library pins CPU at 100% and times out.

---

### 2. Proposed Changes & Exact Diffs
1. Store `width`, `height`, and `mime_type` columns on `pd_file_asset` during initial upload.
2. In `GET /me/media`, query metadata only (never select `data` bytea) and paginate using `LIMIT $1 OFFSET $2`.

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/media-routes.test.ts
```
