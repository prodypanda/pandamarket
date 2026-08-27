# P0-10 · STORED-XSS-SINKS

### P0-10 · Stored XSS Sinks in AI HTML Renders
- **Files:** `frontend/src/app/hub/dashboard/products/page.tsx:6923`, `frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx:3080`
- **Evidence:** AI HTML rendered via `dangerouslySetInnerHTML` without `DOMPurify.sanitize`.
- **Fix Guide:** See [Guide H](../../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md).
