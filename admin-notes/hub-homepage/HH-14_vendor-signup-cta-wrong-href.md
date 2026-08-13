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

- [ ] **Step 1 — Determine the correct destination per auth state**  
  | User State | Correct Destination |
  |---|---|
  | Unauthenticated | `/hub/vendor-signup` |
  | Authenticated as buyer (no store) | `/hub/vendor-signup` |
  | Authenticated as vendor | `/hub/dashboard` |
  | Authenticated as admin | `/dashboard` |

- [ ] **Step 2 — Compute the "Create Store" href dynamically**  
  ```tsx
  // Add this below the existing dashboardHref computation
  const createStoreHref = !currentUser
    ? '/hub/vendor-signup'
    : role === 'buyer' && !currentUser.store_id
      ? '/hub/vendor-signup'
      : role === 'admin' || role === 'super_admin'
        ? '/dashboard'
        : '/hub/dashboard';
  ```

- [ ] **Step 3 — Update the Link href**  
  ```tsx
  // BEFORE
  <Link href="/hub/dashboard" className={...}>
    {t('nav.createStore')}
  </Link>

  // AFTER
  <Link href={createStoreHref} className={...}>
    {currentUser && (role === 'vendor' || currentUser.store_id)
      ? t('nav.dashboard')      // show "Dashboard" for existing vendors
      : t('nav.createStore')    // show "Create Store" for non-vendors
    }
  </Link>
  ```

- [ ] **Step 4 — Confirm `nav.dashboard` translation key exists**  
  Check each locale file. If missing, add:
  ```json
  // fr.json
  "nav.dashboard": "Mon tableau de bord"

  // en.json
  "nav.dashboard": "My Dashboard"

  // ar.json
  "nav.dashboard": "لوحة التحكم"
  ```

- [ ] **Step 5 — Also update the hero sidebar "Sell here" card**  
  In `HubHomeContent.tsx` line ~479:
  ```tsx
  <Link href="/hub/vendor-signup" className="rounded-3xl bg-gradient-to-br ...">
  ```
  This one is already correct (points to vendor-signup). No change needed.

- [ ] **Step 6 — Test all user states**  
  - Open `/hub` in incognito → "Create Store" → lands on `/hub/vendor-signup`.  
  - Log in as a buyer with no store → "Create Store" → lands on `/hub/vendor-signup`.  
  - Log in as a vendor → link shows "Mon tableau de bord" → navigates to `/hub/dashboard`.  
  - Log in as admin → link navigates to `/dashboard`.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/components/hub/HubNavbar.tsx
  git commit -m "feat(hub): route Create Store link to vendor-signup for unauth users, dashboard for vendors"
  ```

---

## Acceptance Criteria
- Unauthenticated visitors clicking "Create Store" land on the vendor signup page.
- Authenticated vendors see "Dashboard" and navigate to their dashboard.
- No user is silently redirected to a login page without context.
