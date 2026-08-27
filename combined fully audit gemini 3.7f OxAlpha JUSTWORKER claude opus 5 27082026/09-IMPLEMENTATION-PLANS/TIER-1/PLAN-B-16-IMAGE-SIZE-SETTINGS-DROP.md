# Engineering Specification: PLAN-B-16
## Add 13 Missing Image Size Keys to `SETTINGS_TAB_KEYS.operations`

- **Target Bug:** [B-16](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-11-TO-B-16-COMMERCE-GAPS.md#b-16)
- **Severity:** 🟠 P1 (Unsaved Admin Controls Discarded on Submit)
- **Estimated Effort:** ⚡ 30 minutes
- **Impacted Systems:** Admin Settings Operations Tab, Image Processing Service.

---

### 1. Summary & Business Impact
`(admin)/settings/page.tsx:5703-5754` renders 13 controls for image sizes (`thumbnail`, `small`, `medium`, `large`) and WebP quality. The backend accepts all 13. However, `SETTINGS_TAB_KEYS.operations` in the frontend omits all 13 keys. When the admin edits dimensions and clicks Save, `pickChangedSettings` discards them.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `frontend/src/app/(admin)/settings/page.tsx`
Add the 13 keys to `SETTINGS_TAB_KEYS.operations`:
```ts
'image_size_thumbnail_w', 'image_size_thumbnail_h', 'image_size_thumbnail_crop',
'image_size_small_w', 'image_size_small_h', 'image_size_small_crop',
'image_size_medium_w', 'image_size_medium_h', 'image_size_medium_crop',
'image_size_large_w', 'image_size_large_h', 'image_size_large_crop',
'image_quality_webp'
```

---

### 3. Automated Verification Plan
```bash
npm run test -w frontend -- src/__tests__/settings-keys-parity.test.tsx
```
