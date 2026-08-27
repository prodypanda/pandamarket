# B-06 to B-10 · Core Commerce Flows & Rendering
#### B-06 · Suspending a buyer doesn't revoke their sessions (duplicate route shadowing)
**Severity:** P1, security-relevant · **Files:** `backend/src/api/admin/reports.routes.ts:185, 208` and `backend/src/api/admin/vendors.routes.ts:164, 187`

`PUT /admin/buyers/:id/suspend` and `/reactivate` are each declared **twice**. `admin.route.ts` mounts `reportsRoutes` at line 40 and `vendorsRoutes` at line 42, so Express always resolves to the reports version — which does **not** call `authService.logout()`, while the vendors version does (`vendors.routes.ts:177`).

The Buyers Directory (`(admin)/buyers/page.tsx:169`) therefore suspends an account whose access token keeps working until it expires.

**How to fix**
1. Delete the duplicate pair from `reports.routes.ts:183-225`; keep the `vendors.routes.ts` version.
2. Add a startup route-manifest assertion that fails on duplicate `method + path` registrations (the E15 split verified 225/225 route *count* parity, which is exactly the check that misses shadowing).

---

### Tier 1 — high

---

#### B-07 · `SELECT DISTINCT` over a `json` column — live 500 on the bundle cross-sell widget
**Severity:** P1, live · **File:** `backend/src/services/product.service.ts:2276-2287`

```sql
SELECT DISTINCT p.id, ..., p.tags, p.attributes, p.metadata, ...,
       COALESCE(img.images, '[]'::json) AS images
```
Postgres cannot compare `json` for equality. Live probe:
```
GET /api/pd/products/by-product/pd_prod_ZuQyAJ6CBfQTW5rZ/bundles?store_id=... → 500
```
`pd_system_log` has **173 occurrences** of `could not identify an equality operator for type json`, 21 in the last 72 h, most recent 2026-08-26 17:12. Consumer: `components/product/BundleCrossPromotionWidget.tsx:47`.

**How to fix:** drop `DISTINCT` and de-duplicate with `GROUP BY p.id` (the LATERAL join is already 1:1), or cast the aggregate to `jsonb`. Add a smoke test that hits this route for a product that participates in a bundle.

---

#### B-08 · JSON-LD injection on the hub homepage
**Severity:** P1 · **File:** `frontend/src/app/hub/page.tsx:333-375`

Both schemas are injected via `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`. `JSON.stringify` does not escape `<`, `>`, or `/`, so a vendor-controlled `product.title` (fed from `/marketplace/feed` at `:353-358`) containing `</script><script>…` breaks out and executes. `marketplace_name`/`tagline` in the organization schema have the same path, and `marketplace_primary_color` is interpolated raw into a `<style>` block at `:371-375`.

**How to fix:** one shared `<JsonLd data={...}/>` component that does `JSON.stringify(d).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')`, and validate the colour setting server-side against `/^#[0-9a-fA-F]{3,8}$/`.

---

#### B-09 · Transient backend failures become permanent 404s
**Severity:** P1 (SEO + UX) · **Files:** `frontend/src/app/hub/products/[id]/page.tsx:107-109, 224`; `hub/pages/[slug]/page.tsx:28-30, 79-82`; `hub/category/[slug]/page.tsx:189-193, 258-286`

The fetch `catch` returns `null`, then the page calls `notFound()`. A backend timeout renders a 404 that crawlers de-index. The category route is worse: a null result renders a styled "Catégorie introuvable" page with **HTTP 200** and no `robots: {index:false}`, and `generateMetadata` builds the title from the slug (`:201-202`) so a nonexistent category still emits an indexable, plausible page.

**How to fix:** return a discriminated result (`{status:'ok'|'missing'|'error'}`); `throw` on `error` so `error.tsx` renders a 500 with retry; `notFound()` only when upstream actually returned 404; add `robots:{index:false}` on the not-found metadata branch.

---

#### B-10 · Checkout success page asserts payment success from a query parameter
**Severity:** P1 · **File:** `frontend/src/app/hub/checkout/success/page.tsx:15, 26-48`

Reads `order_id` from the query string and unconditionally renders **"Payment Successful!"**. Live probe: `https://www.garbage.team/hub/checkout/success?order_id=FAKE123` → **200**, renders success. A redirect back from Flouci/Konnect after a *failed* or *pending* payment lands here and tells the buyer they paid. `orderId` is not null-checked. The "View Order Status" button (`:46-48`) is a `<button>` with **no `onClick`** — a dead primary CTA.

Note this is not hypothetical given the data: 12 of 15 live orders are `payment_required`/`pending`.

**How to fix:** fetch the order and branch on `payment_status` (`captured` / `pending` / `failed`), each with distinct copy; make the CTA a `<Link href="/hub/orders">`; add `robots:{index:false}`; wire the strings through i18n.

---
