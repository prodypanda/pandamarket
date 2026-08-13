# AS-15 — Image Size Settings Have No Aspect Ratio Validation

**Severity:** 🟡 Enhancement  
**Area:** Superadmin Settings — Operations Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Impact:** Admins can configure `image_size_thumbnail_w`, `image_size_thumbnail_h`, `image_size_medium_w/h`, etc. with arbitrary width and height values. Setting `thumbnail_w=1200` and `thumbnail_h=50` would produce extreme 24:1 aspect ratio thumbnails that distort every product image across the platform. No client-side or server-side validation warns about unreasonable ratios.

---

## Enhancement Checklist

- [ ] **Step 1 — Understand the image size fields**  
  The four size tiers are:
  - `thumbnail` (150×150 default) — used in search results, cart items  
  - `small`     (300×300 default) — used in category listings  
  - `medium`    (600×600 default) — used in product cards, deal sections  
  - `large`     (1200×1200 default) — used in product detail pages  

- [ ] **Step 2 — Add a computed aspect ratio display next to each pair of inputs**  
  ```tsx
  function renderImageSizeInputs(
    prefix: 'thumbnail' | 'small' | 'medium' | 'large',
    label: string,
  ) {
    const wKey = `image_size_${prefix}_w` as keyof PlatformSettings;
    const hKey = `image_size_${prefix}_h` as keyof PlatformSettings;
    const w = Number(settings[wKey]);
    const h = Number(settings[hKey]);
    const ratio = h > 0 ? (w / h).toFixed(2) : '∞';
    const isSquare = Math.abs(w - h) <= 10;
    const isExtreme = h > 0 && (w / h > 3 || h / w > 3);

    return (
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="number" min={50} max={4000}
              value={w}
              onChange={(e) => updateSetting(wKey, Number(e.target.value) as any)}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-3 py-2.5
                         text-sm font-bold text-slate-700 outline-none focus:border-[#B91C1C]"
            />
            <span className="text-xs text-slate-400 font-bold">×</span>
            <input
              type="number" min={50} max={4000}
              value={h}
              onChange={(e) => updateSetting(hKey, Number(e.target.value) as any)}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 px-3 py-2.5
                         text-sm font-bold text-slate-700 outline-none focus:border-[#B91C1C]"
            />
          </div>
          <span className={`rounded-lg px-3 py-2 text-xs font-black shrink-0
            ${isSquare ? 'bg-emerald-100 text-emerald-700'
              : isExtreme ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-600'}`}>
            {ratio}:1
          </span>
        </div>
        {isExtreme && (
          <p className="text-xs font-bold text-red-600">
            ⚠ Extreme aspect ratio detected ({ratio}:1). Product images will be severely
            distorted. Recommended: use a ratio between 0.5:1 and 2:1 (square is ideal).
          </p>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 3 — Replace the existing raw `renderNumberInput` calls for image sizes**  
  Find in the settings page where `image_size_*` fields are rendered and replace them with calls to `renderImageSizeInputs('thumbnail', 'Thumbnail Size (px)')`, etc.

- [ ] **Step 4 — Add min/max constraints in `buildSettingsPayload`**  
  ```ts
  // In buildSettingsPayload
  for (const prefix of ['thumbnail', 'small', 'medium', 'large'] as const) {
    const wKey = `image_size_${prefix}_w` as keyof PlatformSettings;
    const hKey = `image_size_${prefix}_h` as keyof PlatformSettings;
    payload[wKey] = Math.max(50, Math.min(4000, Number(payload[wKey]))) as any;
    payload[hKey] = Math.max(50, Math.min(4000, Number(payload[hKey]))) as any;
  }
  ```

- [ ] **Step 5 — Add a visual size preview**  
  Show a rectangle representing the image dimensions at a scaled-down visual:
  ```tsx
  <div
    className="rounded border border-slate-200 bg-slate-100"
    style={{
      width:  `${Math.min(w / 10, 120)}px`,
      height: `${Math.min(h / 10, 120)}px`,
      minWidth: '20px',
      minHeight: '20px',
    }}
    title={`${w}×${h}px`}
  />
  ```

- [ ] **Step 6 — Test with extreme values**  
  - Set thumbnail to 1200×50 → red warning appears.  
  - Save → confirm backend clamps to min/max limits.  
  - Set thumbnail to 200×200 → green "square" indicator appears.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add aspect ratio validation and visual preview to image size settings"
  ```

---

## Acceptance Criteria
- Each image size tier shows the current W×H and computed aspect ratio.
- Ratios outside the 0.5–2.0 range show a red warning.
- Square ratios (±10px) show a green "square" indicator.
- Dimensions outside 50–4000px range are rejected by `buildSettingsPayload`.
