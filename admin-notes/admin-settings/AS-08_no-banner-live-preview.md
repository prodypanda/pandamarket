# AS-08 — No Live Preview of Hub Banner in Settings Panel

**Severity:** 🟡 Enhancement  
**Area:** Superadmin Settings — Marketplace Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Impact:** Admins editing the hero banner fields (`hub_homepage_banner_title`, `hub_homepage_banner_subtitle`, `hub_homepage_banner_cta_label`, `hub_homepage_banner_image_url`) must: save → wait for Next.js ISR revalidation → open the hub in another tab → check the result. A live preview card would show the result immediately as the admin types, reducing the edit-check cycle from minutes to seconds.

---

## Enhancement Checklist

- [ ] **Step 1 — Identify where banner fields are rendered in the Marketplace tab**  
  Search for `hub_homepage_banner_title` in the settings page to find the section.

- [ ] **Step 2 — Add a live preview card below the banner fields**  
  Create a preview component that renders the banner using the current form values:
  ```tsx
  {/* Banner Preview — updates live as admin types */}
  <div className="md:col-span-2 space-y-2">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
      Banner Preview
    </p>
    <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white
                    min-h-[200px] shadow-xl">
      {/* Background image */}
      {settings.hub_homepage_banner_image_url && (
        <img
          src={settings.hub_homepage_banner_image_url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(22,199,132,0.4),transparent_30%)]" />
      {/* Content */}
      <div className="relative p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15
                        bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur">
          {settings.marketplace_tagline || 'La marketplace tunisienne'}
        </div>
        <h1 className="text-2xl font-black text-white">
          {settings.hub_homepage_banner_title || 'Your Banner Title Here'}
        </h1>
        <p className="mt-2 text-sm text-white/75">
          {settings.hub_homepage_banner_subtitle || 'Your banner subtitle will appear here'}
        </p>
        <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-white/15
                        bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-lg">
          <span className="text-gray-400 text-xs">Search…</span>
          <span className="rounded-full bg-[#16C784] px-4 py-1.5 text-xs font-black text-white">
            {settings.hub_homepage_banner_cta_label || 'Explore'}
          </span>
        </div>
      </div>
    </div>
    <p className="text-[11px] text-slate-400 ml-1">
      ℹ Preview approximates the live layout. Save and refresh /hub to see exact rendering.
    </p>
  </div>
  ```

- [ ] **Step 3 — Position the preview card**  
  Place it directly below the four banner input fields (title, subtitle, CTA label, CTA URL, image URL) in a `md:col-span-2` container so it spans the full width.

- [ ] **Step 4 — Add a theme-aware preview toggle**  
  If the active theme is `aliexpress` or `aliexpress2`, adjust the preview colors accordingly:
  ```tsx
  const previewGradient = settings.marketplace_theme === 'aliexpress' || settings.marketplace_theme === 'aliexpress2'
    ? 'from-[#ff4747]/40 to-transparent'
    : 'from-[#16C784]/40 to-transparent';
  ```

- [ ] **Step 5 — Add a "View live page" button**  
  ```tsx
  <a
    href="/hub"
    target="_blank"
    rel="noopener"
    className="inline-flex items-center gap-2 rounded-xl border border-slate-200
               px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
  >
    <Eye className="h-3.5 w-3.5" />
    View live page
  </a>
  ```

- [ ] **Step 6 — Test live update responsiveness**  
  - Type in the banner title field → preview title updates immediately.  
  - Paste an image URL → preview background image appears.  
  - Clear the title → placeholder text appears.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add live banner preview card that updates as admin types"
  ```

---

## Acceptance Criteria
- A preview card below the banner fields updates in real-time as the admin types.
- The preview reflects the title, subtitle, CTA label, and background image.
- A "View live page" button opens `/hub` in a new tab.
- The preview respects the active theme (green for Panda, orange/red for AliExpress).
