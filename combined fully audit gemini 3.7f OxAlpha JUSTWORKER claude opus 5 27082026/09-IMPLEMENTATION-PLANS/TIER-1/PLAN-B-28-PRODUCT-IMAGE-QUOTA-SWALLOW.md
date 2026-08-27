# Engineering Specification: PLAN-B-28
## Handle Product Image Quota Rejections & Surface Errors to Merchants

- **Target Bug:** [B-28](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-27-TO-B-33-FRONTEND-DATA.md#b-28)
- **Severity:** 🟠 P1 (Silent Data Loss / False Success Toast)
- **Estimated Effort:** ⚡ 45 minutes
- **Impacted Systems:** Products Dashboard Drawer, Image Upload Helpers.

---

### 1. Summary & Business Impact
In `products/page.tsx:2543-2583`, `saveProductImage` and `saveGalleryImages` call `await fetchWithCsrf(...)` but never inspect `res.ok`. When a Free seller exceeds their `max_images_per_product` limit, the backend returns `403 Forbidden`, but the UI shows "Produit mis à jour avec succès", silently discarding images 3 through 6.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `frontend/src/app/hub/dashboard/products/page.tsx`
```ts
const res = await fetchWithCsrf(`/api/pd/me/products/${productId}/images`, {
  method: 'POST',
  body: JSON.stringify({ image_url: url }),
});
if (!res.ok) {
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData.message || 'Limite d\'images par produit atteinte');
}
```

---

### 3. Automated Verification Plan
```bash
npm run type-check -w frontend
```
