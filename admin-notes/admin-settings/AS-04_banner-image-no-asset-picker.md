# AS-04 — Hub Banner Image URL Has No Asset Picker Button

**Severity:** 🔴 Bug (UX Inconsistency)  
**Area:** Superadmin Settings — Marketplace Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Impact:** The `hub_homepage_banner_image_url` field is a plain `<input type="text">` with no upload or asset picker button. All other image fields (logo, logo light, logo dark, maintenance illustration) have an "Upload / Choose" button that opens the `MarketplaceAssetPicker`. The banner image field is the most important visual asset for the homepage — admins must paste a raw URL instead of browsing their uploaded media library.

---

## Root Cause

`MarketplaceAssetPicker` is imported and wired to four fields:
```ts
// settings/page.tsx:1059
const [marketplaceLogoPickerTarget, setMarketplaceLogoPickerTarget] = useState<
  'marketplace_logo_url' | 'marketplace_logo_light_url' | 'marketplace_logo_dark_url' | 'maintenance_illustration_url' | null
>(null);
```

`hub_homepage_banner_image_url` is **not in this union** — it was never added to the asset picker system.

---

## Fix Checklist

- [ ] **Step 1 — Extend the picker target type to include the banner image**  
  Update the `useState` type union:
  ```ts
  const [marketplaceLogoPickerTarget, setMarketplaceLogoPickerTarget] = useState<
    | 'marketplace_logo_url'
    | 'marketplace_logo_light_url'
    | 'marketplace_logo_dark_url'
    | 'maintenance_illustration_url'
    | 'hub_homepage_banner_image_url'    // ← add this
    | 'marketplace_og_image_url'          // ← consider adding this too
    | 'marketplace_favicon_url'           // ← consider adding this too
    | null
  >(null);
  ```

- [ ] **Step 2 — Find where `hub_homepage_banner_image_url` is rendered in the Marketplace tab**  
  Search for `hub_homepage_banner_image_url` in the file to locate its render call (likely a `renderTextInput` call inside the marketplace tab's JSX).

- [ ] **Step 3 — Replace the plain text input with a text + picker button combo**  
  Using the same pattern as the logo fields, add an asset picker button:
  ```tsx
  {/* Banner Image */}
  <div className="space-y-2">
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
      Banner Image
    </label>
    <div className="flex gap-2">
      <input
        type="text"
        value={settings.hub_homepage_banner_image_url}
        placeholder="https://... or upload below"
        onChange={(e) => updateSetting('hub_homepage_banner_image_url', e.target.value)}
        className="flex-1 rounded-xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm
                   font-bold text-slate-700 outline-none focus:border-[#B91C1C] focus:bg-white
                   focus:ring-2 focus:ring-[#B91C1C]/15"
      />
      <button
        type="button"
        onClick={() => setMarketplaceLogoPickerTarget('hub_homepage_banner_image_url')}
        className="flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-3 text-xs
                   font-bold text-white hover:bg-[#991B1B] shrink-0"
      >
        <UploadCloud className="h-4 w-4" />
        Choose
      </button>
    </div>
    {settings.hub_homepage_banner_image_url && (
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <img
          src={settings.hub_homepage_banner_image_url}
          alt="Banner preview"
          className="h-32 w-full object-cover"
        />
      </div>
    )}
  </div>
  ```

- [ ] **Step 4 — Confirm `MarketplaceAssetPicker` handles the new key**  
  The picker sets the value via:
  ```tsx
  onSelect={(url) => {
    if (marketplaceLogoPickerTarget) {
      updateSetting(marketplaceLogoPickerTarget, url);
    }
    setMarketplaceLogoPickerTarget(null);
  }}
  ```
  This uses `marketplaceLogoPickerTarget` as a key directly on `settings`. Since `hub_homepage_banner_image_url` is a valid key of `PlatformSettings`, this should work without any further change.

- [ ] **Step 5 — Also add picker buttons for `marketplace_og_image_url` and `marketplace_favicon_url`**  
  Follow the same pattern for these two fields — both are visual assets but currently render as plain text inputs.

- [ ] **Step 6 — Test the flow**  
  - Open Marketplace tab in admin settings.  
  - Find the Banner Image field.  
  - Click "Choose" → asset picker modal opens.  
  - Select an image → the URL populates in the text field.  
  - A preview thumbnail appears below the input.  
  - Save → visit `/hub` → confirm the banner image appears.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "fix(admin/settings): add asset picker button to hub_homepage_banner_image_url field"
  ```

---

## Acceptance Criteria
- The banner image field has an "Upload / Choose" button that opens `MarketplaceAssetPicker`.
- Selecting an image from the picker populates the text field.
- A thumbnail preview appears when the field has a value.
- The same fix is applied to `marketplace_og_image_url` and `marketplace_favicon_url`.
