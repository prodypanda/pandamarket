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

### Option A — Wire the existing CTA card to the seller rail settings (Quick Fix)

- [ ] **Step 1 — Pass `hub_hero_seller_rail_*` fields through `marketplaceSettings` to `HubHomeContent`**  
  These keys are already in the `MarketplaceSettings` type in `hub/page.tsx` (passed via `getMarketplaceSettings()`).  
  Extend the `MarketplaceSettings` interface in `HubHomeContent.tsx` to include them:
  ```ts
  interface MarketplaceSettings {
    // ... existing keys ...
    hub_hero_show_seller_rail?: boolean | string;
    hub_hero_seller_rail_title?: string;
    hub_hero_seller_rail_subtitle?: string;
    hub_hero_seller_rail_cta_label?: string;
    hub_hero_seller_rail_cta_url?: string;
    hub_hero_seller_rail_badge_text?: string;
  }
  ```

- [ ] **Step 2 — Use the settings values in the hero aside CTA card**  
  In `HubHomeContent.tsx` line ~479, replace the hardcoded "Create Store" card:
  ```tsx
  {marketplaceSettings?.hub_hero_show_seller_rail !== false && (
    <Link
      href={marketplaceSettings?.hub_hero_seller_rail_cta_url || '/hub/vendor-signup'}
      className="rounded-3xl bg-gradient-to-br from-[#16C784] to-[#0f9f6e] p-5 text-white
                 shadow-xl shadow-[#16C784]/20 transition hover:-translate-y-1"
    >
      <Store className="mb-4 h-8 w-8" />
      {marketplaceSettings?.hub_hero_seller_rail_badge_text && (
        <span className="mb-2 inline-flex rounded-full bg-white/20 px-2 py-0.5
                         text-[10px] font-black text-white">
          {marketplaceSettings.hub_hero_seller_rail_badge_text}
        </span>
      )}
      <p className="text-lg font-black">
        {marketplaceSettings?.hub_hero_seller_rail_title || t('hub.hero.ctaCreateStore')}
      </p>
      <p className="mt-2 text-sm text-white/75">
        {marketplaceSettings?.hub_hero_seller_rail_subtitle || 'Launch your seller storefront.'}
      </p>
      <div className="mt-4 flex items-center gap-2 font-bold text-sm">
        {marketplaceSettings?.hub_hero_seller_rail_cta_label || t('nav.createStore')}
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  )}
  ```

### Option B — Add a contextual note in the settings UI (Alternative)

If the seller rail is intentionally only for specific themes (e.g. Amazon/Alibaba), add a note in the settings:

- [ ] **Step 3 — Add a layout-awareness note to the seller rail section**  
  ```tsx
  {settings.hub_homepage_layout === 'classic' || settings.hub_homepage_layout === 'theme_default' ? (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-bold text-amber-800">
        ℹ These seller rail settings apply to the Amazon and Alibaba layouts.
        For the Classic Hub layout, the seller CTA card below the hero uses these values.
      </p>
    </div>
  ) : null}
  ```

- [ ] **Step 4 — Test the wired settings**  
  - Set `hub_hero_seller_rail_title` to "Devenez Vendeur".  
  - Set `hub_hero_seller_rail_cta_url` to `/hub/vendor-signup`.  
  - Save → visit `/hub` → the seller card should show the new title and link.

- [ ] **Step 5 — Commit**  
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
