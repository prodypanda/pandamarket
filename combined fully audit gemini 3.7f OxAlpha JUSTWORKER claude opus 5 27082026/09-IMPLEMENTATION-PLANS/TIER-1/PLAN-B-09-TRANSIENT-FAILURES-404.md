# Engineering Specification: PLAN-B-09
## Distinguish Transient Backend Failures from Permanent 404s in SSR Routes

- **Target Bug:** [B-09](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-06-TO-B-10-CORE-FLOWS.md#b-09)
- **Severity:** 🟠 P1 (SEO De-indexing & Degraded User Experience)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Product Detail SSR, Category SSR, CMS Page SSR.

---

### 1. Summary & Business Impact
In `hub/products/[id]/page.tsx:107`, `hub/pages/[slug]/page.tsx:28`, and `hub/category/[slug]/page.tsx:189`, fetch `catch` blocks catch network or 500 errors and return `null`. The page components then call `notFound()`. 
If Render has a 5-second cold boot or transient timeout, Google crawlers receive a 404 and permanently de-index high-value product and category pages. Category pages even return a styled "Catégorie introuvable" page with **HTTP 200** without `robots: { index: false }`.

---

### 2. Proposed Changes & Exact Diffs

#### Modify SSR Fetch Helpers to Return Discriminated Unions
```ts
type FetchResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'not_found' }
  | { status: 'error'; error: string };

export async function fetchProduct(id: string): Promise<FetchResult<Product>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/pd/products/${id}`, { next: { revalidate: 60 } });
    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) return { status: 'error', error: `Upstream error ${res.status}` };
    const data = await res.json();
    return { status: 'ok', data: data.data };
  } catch (err: any) {
    return { status: 'error', error: err.message };
  }
}
```

In the page component:
```tsx
const result = await fetchProduct(params.id);
if (result.status === 'not_found') {
  notFound();
}
if (result.status === 'error') {
  throw new Error(result.error); // Triggers error.tsx for retry with 500 status
}
```

---

### 3. Automated Verification Plan
```bash
npm run test -w frontend -- src/__tests__/ssr-error-handling.test.tsx
```
