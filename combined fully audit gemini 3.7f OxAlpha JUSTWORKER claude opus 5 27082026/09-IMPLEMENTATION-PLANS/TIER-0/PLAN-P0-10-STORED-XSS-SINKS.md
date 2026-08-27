# Engineering Specification: PLAN-P0-10
## Sanitize Stored XSS Sinks in AI HTML Descriptions and Admin Inspect Drawers

- **Target Bug:** [P0-10](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-10-STORED-XSS-SINKS.md)
- **Severity:** 🔴 P0 (Stored Cross-Site Scripting / Account Compromise)
- **Estimated Effort:** ⚡ 45 minutes
- **Impacted Systems:** Vendor Products Drawer, Superadmin AI Costs Dashboard, Rich Text Renderers.

---

### 1. Summary & Business Impact
In `frontend/src/app/hub/dashboard/products/page.tsx:6923` and `frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx:3080`, AI-generated descriptions and prompt inspect outputs are rendered via:
`dangerouslySetInnerHTML={{ __html: aiOutput }}`
without sanitizing through `DOMPurify`. If a prompt injection attack occurs or if an AI output contains crafted JavaScript (`<img src=x onerror=alert(1)>`), the script executes in the vendor's or platform administrator's session, enabling session hijacking and credential theft.

---

### 2. Root Cause & Blast Radius
- **Root Cause:** Direct interpolation of unescaped HTML strings into React's `dangerouslySetInnerHTML`.
- **Blast Radius:** Full session compromise of administrators inspecting AI prompts or merchants viewing AI-generated copy.

---

### 3. Proposed Changes & Exact Diffs

#### A. Modify `frontend/src/app/hub/dashboard/products/page.tsx`
```diff
--- a/frontend/src/app/hub/dashboard/products/page.tsx
+++ b/frontend/src/app/hub/dashboard/products/page.tsx
@@ -45,6 +45,7 @@ import {
   ChevronRight,
   Layers,
 } from 'lucide-react';
+import DOMPurify from 'isomorphic-dompurify';
 
 export default function ProductsDashboardPage() {
@@ -6920,7 +6921,7 @@ export default function ProductsDashboardPage() {
                     <div
                       className="text-xs text-muted-foreground prose prose-sm max-w-none"
-                      dangerouslySetInnerHTML={{ __html: smartFillSuggestions.description }}
+                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(smartFillSuggestions.description) }}
                     />
```

#### B. Modify `frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx`
```diff
--- a/frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx
+++ b/frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx
@@ -35,6 +35,7 @@ import {
   RefreshCw,
 } from 'lucide-react';
+import DOMPurify from 'isomorphic-dompurify';
 
 export function AiCostsDashboard() {
@@ -3077,7 +3078,7 @@ export function AiCostsDashboard() {
               <div
                 className="p-3 bg-muted rounded font-mono text-xs overflow-auto max-h-60"
-                dangerouslySetInnerHTML={{ __html: selectedJob.output }}
+                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedJob.output) }}
               />
```

---

### 4. Concurrency, Security & Edge Cases
- **Allowed Tags:** Configure `DOMPurify` to allow formatting tags (`<p>`, `<b>`, `<i>`, `<ul>`, `<li>`, `<strong>`) while stripping `<script>`, `<iframe>`, `onerror`, `onload`.

---

### 5. Automated Verification Plan
```bash
npm run type-check -w frontend
npm run test -w frontend -- src/__tests__/sanitization.test.tsx
```

---

### 6. Manual Verification Procedure
1. Inject test HTML into `smartFillSuggestions.description`:
```html
<p>Product description<img src="invalid" onerror="window.__xss_fired=true"></p>
```
2. Verify in browser developer tools:
`window.__xss_fired` must remain `undefined`, and the `onerror` attribute must be absent from the rendered DOM.

---

### 7. Rollback Strategy
```bash
git checkout HEAD -- frontend/src/app/hub/dashboard/products/page.tsx frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx
```
