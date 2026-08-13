# HH-06 — Account/Login Link Flashes Wrong Href Before Auth Check Completes

**Severity:** 🔴 Bug  
**Area:** Hub Navbar — Authentication State  
**File:** `frontend/src/components/hub/HubNavbar.tsx`  
**Line:** 63  
**Impact:** An unauthenticated visitor briefly sees the Account icon pointing to `/hub/account` during the ~200–500ms it takes for the auth check (`/api/pd/auth/me`) to complete. After `authChecked` becomes `true` and `currentUser` is `null`, the link switches to `/login/buyer`. This flash is noticeable on slow connections and can confuse users into clicking a broken link.

---

## Root Cause

```tsx
// HubNavbar.tsx:52–63
const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
const [authChecked, setAuthChecked] = useState(false);
// ...
const accountHref = currentUser ? dashboardHref : authChecked ? '/login/buyer' : '/hub/account';
//                                                 ↑ correct                     ↑ wrong default
```

Before `authChecked` is `true`, `accountHref` defaults to `/hub/account`. When the auth call completes and the user is unauthenticated (`authChecked=true, currentUser=null`), the href switches to `/login/buyer`. This creates a brief flash where the link is wrong.

---

## Fix Checklist

- [ ] **Step 1 — Change the default `accountHref` to match the unauthenticated state**  
  The safest default is `/login/buyer` (the correct destination for unauthenticated users):
  ```ts
  // BEFORE
  const accountHref = currentUser ? dashboardHref : authChecked ? '/login/buyer' : '/hub/account';

  // AFTER — default to /login/buyer while auth check is in-flight
  const accountHref = currentUser
    ? dashboardHref
    : '/login/buyer';
  ```
  This removes the intermediate `/hub/account` fallback entirely.  
  If `/hub/account` is a valid page for unauthenticated users (e.g. it itself redirects to login), you can keep it — but the flash disappears either way because the href is now stable.

- [ ] **Step 2 — Optional: show a loading skeleton for the account link while checking**  
  If you want zero flash of incorrect content, conditionally render a placeholder while `!authChecked`:
  ```tsx
  {!authChecked ? (
    <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />
  ) : (
    <Link href={accountHref} className={...}>
      <User className="w-5 h-5" />
      <span className="ms-2 text-sm font-medium hidden sm:block">
        {currentUser ? 'Mon compte' : t('nav.login')}
      </span>
    </Link>
  )}
  ```

- [ ] **Step 3 — Verify the `dashboardHref` logic is still correct**  
  ```ts
  const role = currentUser?.role?.toLowerCase();
  const dashboardHref =
    role === 'admin' || role === 'super_admin' ? '/dashboard'
    : role === 'vendor' || currentUser?.store_id ? '/hub/dashboard'
    : '/hub/account';
  ```
  Confirm that `/hub/account` is the correct fallback for authenticated users who are neither admin nor vendor.

- [ ] **Step 4 — Test all auth states**  
  - Unauthenticated: clicking account icon → redirects to `/login/buyer`  
  - Authenticated buyer: clicking account → goes to `/hub/account`  
  - Authenticated vendor: clicking account → goes to `/hub/dashboard`  
  - Authenticated admin: clicking account → goes to `/dashboard`

- [ ] **Step 5 — Commit**  
  ```
  git add frontend/src/components/hub/HubNavbar.tsx
  git commit -m "fix(hub): remove account link href flash by defaulting to /login/buyer before auth check"
  ```

---

## Acceptance Criteria
- No visible link text or href change occurs on the account icon after page load.
- Unauthenticated users are always directed to `/login/buyer`.
- Authenticated users are always directed to the correct dashboard.
