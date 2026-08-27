# Engineering Specification: PLAN-B-08
## Escape JSON-LD Structured Data on Marketplace Homepage

- **Target Bug:** [B-08](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-06-TO-B-10-CORE-FLOWS.md#b-08)
- **Severity:** 🟠 P1 (Stored XSS / Script Injection via Schema)
- **Estimated Effort:** ⚡ 30 minutes
- **Impacted Systems:** Hub Homepage, SEO Structured Data, Search Engine Indexer.

---

### 1. Summary & Business Impact
In `frontend/src/app/hub/page.tsx:333-375`, Organization and Product schemas are injected via `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`. `JSON.stringify` does not escape `<`, `>`, or `/`. A vendor naming a product with `</script><script>alert(1)</script>` will break out of the JSON-LD script block and execute arbitrary JavaScript on the marketplace homepage for every visitor.

---

### 2. Proposed Changes & Exact Diffs

#### A. Create Shared Component `frontend/src/components/seo/JsonLd.tsx`
```tsx
import React from 'react';

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data)
    .replace(/</g, '\u003c')
    .replace(/>/g, '\u003e')
    .replace(/\u2028/g, '\u2028')
    .replace(/\u2029/g, '\u2029');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
```

#### B. Modify `frontend/src/app/hub/page.tsx`
Replace raw `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}>` with:
```tsx
<JsonLd data={organizationSchema} />
<JsonLd data={itemListSchema} />
```

---

### 3. Automated Verification Plan
```bash
npm run type-check -w frontend
npm run test -w frontend -- src/__tests__/json-ld.test.tsx
```
