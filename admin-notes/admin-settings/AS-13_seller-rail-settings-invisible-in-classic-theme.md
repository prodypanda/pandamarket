# AS-13 — Seller Rail Settings Have No Effect on Classic Theme

**Severity:** 🟡 Enhancement  
**Area:** Superadmin Settings — Marketplace Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Lines:** 300–304, 715–731  
**Impact:** The Marketplace tab exposes 5 seller rail settings: `hub_hero_show_seller_rail`, `hub_hero_seller_rail_title`, `hub_hero_seller_rail_subtitle`, `hub_hero_seller_rail_cta_label`, `hub_hero_seller_rail_cta_url`, `hub_hero_seller_rail_badge_text`. These fields exist in `DEFAULT_SETTINGS` and are stored in the DB — but `HubHomeContent.tsx` (the classic theme) never renders a seller rail. Admins editing these fields see zero effect on the live Hub, which is confusing and misleading.

---

## Root Cause

```ts
// DEFAULT_SETTINGS (settings/page.tsx:300–304)
hub_hero_show_seller_rail: true,
hub_hero_seller_rail_title: 'Accès Vendeurs & Fournisseurs',
hub_hero_seller_rail_subtitle: 'Ouvrez votre boutique B2B ou accédez à votre espace fournisseur',
hub_hero_seller_rail_cta_label: 'Espace Vendeur',
hub_hero_seller_rail_cta_url: '/hub/dashboard',
hub_hero_seller_rail_badge_text: 'PandaMarket B2B',
```

None of these are read in `HubHomeContent.tsx`. The hero "aside" on the right already has a hardcoded "Create Store" card at the bottom (line ~479), but it ignores these settings.

---

## Fix Checklist

### Option A — Wire the existing CTA card to the seller rail settings (Implemented)

- [x] **Step 1 — Pass `hub_hero_seller_rail_*` fields through `marketplaceSettings` to `HubHomeContent`**  
- [x] **Step 2 — Use the settings values in the hero aside CTA card**  
- [x] **Step 3 — Add a layout-awareness note to the seller rail section in Settings**  
- [x] **Step 4 — Test the wired settings**  
- [x] **Step 5 — Commit**  
  ```
  git add frontend/src/components/hub/HubHomeContent.tsx
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(hub): wire hub_hero_seller_rail_* settings to the classic theme hero CTA card"
  ```

---

## Acceptance Criteria
- Changing `hub_hero_seller_rail_title` in admin settings updates the hero CTA card text on `/hub`.
- `hub_hero_show_seller_rail: false` hides the CTA card entirely.
- The settings fields clearly indicate which layouts they affect.
