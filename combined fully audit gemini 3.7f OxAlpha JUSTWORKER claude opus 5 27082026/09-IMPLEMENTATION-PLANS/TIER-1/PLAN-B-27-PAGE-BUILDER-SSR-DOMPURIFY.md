# Engineering Specification: PLAN-B-27
## Apply `isomorphic-dompurify` on Server-Rendered Page Builder HTML

- **Target Bug:** [B-27](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-27-TO-B-33-FRONTEND-DATA.md#b-27)
- **Severity:** 🟠 P1 (XSS on Server-Rendered Custom Pages)
- **Estimated Effort:** 🛠 1 hour
- **Impacted Systems:** SafePageRenderer, Page Builder SSR.

---

### 1. Summary & Business Impact
In `frontend/src/components/page-builder/SafePageRenderer.tsx:111`, server-side markup uses a custom regex sanitizer (`sanitizeHtmlInitial`). DOMPurify only executes in `useEffect` after client hydration. The regex does not decode HTML entities, allowing `href="&#106;avascript:alert(1)"` to survive to the browser. A user clicking a link before hydration executes the malicious script.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `frontend/src/components/page-builder/SafePageRenderer.tsx`
Replace regex sanitizer with `isomorphic-dompurify` on both SSR and client passes:
```ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'img', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
  });
}
```

---

### 3. Automated Verification Plan
```bash
npm run test -w frontend -- src/__tests__/page-builder-sanitization.test.tsx
```
