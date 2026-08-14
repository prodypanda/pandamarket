# HH-14 — "Create Store" Nav Link Sends Unauthenticated Users to Dashboard

**Severity:** 🟡 Enhancement  
**Area:** Hub Navbar  
**File:** `frontend/src/components/hub/HubNavbar.tsx`  
**Line:** 175  
**Impact:** The "Create Store" link in the navbar always points to `/hub/dashboard`. For unauthenticated visitors, this redirects them to a login page with no context about why they're being asked to log in. Unauthenticated users should land on the vendor signup/onboarding page instead, improving conversion.

---

## Current State

```tsx
// HubNavbar.tsx:175
<Link href="/hub/dashboard" className={...}>
  {t('nav.createStore')}
</Link>
```

This always navigates to `/hub/dashboard` regardless of whether the user is authenticated, and regardless of their role.

---

## Enhancement Checklist

- [x] **Step 1 — Determine the correct destination per auth state**  
  | User State | Correct Destination |
  |---|---|
  | Unauthenticated | `/hub/vendor-signup` |
  | Authenticated as buyer (no store) | `/hub/vendor-signup` |
  | Authenticated as vendor | `/hub/dashboard` |
  | Authenticated as admin | `/dashboard` |

- [x] **Step 2 — Compute the "Create Store" href dynamically**  
- [x] **Step 3 — Update the Link href**  
- [x] **Step 4 — Confirm `nav.dashboard` translation key exists**  
- [x] **Step 5 — Also update the hero sidebar "Sell here" card**  
- [x] **Step 6 — Test all user states**  
- [x] **Step 7 — Commit**  
  ```
  git add frontend/src/components/hub/HubNavbar.tsx
  git commit -m "feat(hub): route Create Store link to vendor-signup for unauth users, dashboard for vendors"
  ```

---

## Acceptance Criteria
- Unauthenticated visitors clicking "Create Store" land on the vendor signup page.
- Authenticated vendors see "Dashboard" and navigate to their dashboard.
- No user is silently redirected to a login page without context.
