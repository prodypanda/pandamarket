# Engineering Specification: PLAN-T4-04
## Storefront Offline Progressive Web App (PWA) & Instant Guest Checkout

- **Target Task:** [T4-04](../../00-MASTER-CHECKLIST/TIER-4-GROWTH-ROADMAP.md)
- **Severity:** 💡 Mobile Speed & Offline Resilience
- **Estimated Effort:** 🛠 4 hours
- **Impacted Systems:** Storefront PWA Service Worker, Cart Cache, Next.js Manifest.

---

### 1. Summary & Business Impact
Tunisian mobile internet often experiences intermittent 3G/4G coverage outside major metropolitan areas. A full Progressive Web App with service-worker asset caching and IndexedDB cart persistence allows shoppers to browse catalogs and add items to cart completely offline, submitting their order automatically when connectivity resumes.

---

### 2. Implementation Details
1. Service worker implementation using Serwist / Workbox.
2. Cache catalog responses and product images in CacheStorage.
3. Persist cart items in IndexedDB with background synchronization.
4. "Add to Home Screen" installation prompt customized with store branding.

---

### 3. Verification Plan
```bash
npm run test -w frontend -- src/__tests__/pwa-service-worker.test.tsx
```
