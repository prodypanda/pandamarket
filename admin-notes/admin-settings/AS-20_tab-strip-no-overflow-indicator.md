# AS-20 — Tab Strip Has No Visual Overflow Indicator on Mobile

**Severity:** 🟢 Improvement  
**Area:** Superadmin Settings — Tab Navigation  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1498–1527  
**Impact:** The settings tab strip uses `overflow-x-auto` to allow horizontal scrolling on small screens. However, there is no visual indication that more tabs exist beyond the visible viewport (no gradient fade, no scroll hint, no arrows). Mobile admins frequently miss the "Integrations", "Plans", and "Email" tabs entirely because there is no affordance indicating that the list continues.

---

## Improvement Checklist

- [ ] **Step 1 — Wrap the tab strip in a scroll-aware container**  
  ```tsx
  function TabStrip() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft]   = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    function updateScrollState() {
      const el = scrollRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      updateScrollState();
      el.addEventListener('scroll', updateScrollState, { passive: true });
      window.addEventListener('resize', updateScrollState);
      return () => {
        el.removeEventListener('scroll', updateScrollState);
        window.removeEventListener('resize', updateScrollState);
      };
    }, []);

    return (
      <div className="relative">
        {/* Left fade gradient */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16
                          bg-gradient-to-r from-white to-transparent" />
        )}
        {/* Right fade gradient */}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16
                          bg-gradient-to-l from-white to-transparent" />
        )}

        {/* Scroll buttons */}
        {canScrollLeft && (
          <button
            type="button"
            aria-label="Scroll tabs left"
            onClick={() => scrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
            className="absolute left-1 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8
                       items-center justify-center rounded-full bg-white shadow-md
                       border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            aria-label="Scroll tabs right"
            onClick={() => scrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
            className="absolute right-1 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8
                       items-center justify-center rounded-full bg-white shadow-md
                       border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* The scrollable tab list */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200/80
                     bg-white p-2.5 shadow-sm"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                title={tab.description}
                className={`group relative flex shrink-0 items-center gap-2.5 rounded-xl px-4
                            py-2.5 text-xs font-bold transition-all ${
                              selected
                                ? 'bg-gradient-to-r from-[#B91C1C] to-[#991B1B] text-white shadow-md'
                                : 'bg-stone-50 text-slate-600 hover:bg-amber-50/70'
                            }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2 — Import `ChevronLeft` and `ChevronRight` from lucide-react**  
  Add to the lucide imports at the top of the file if not already present.

- [ ] **Step 3 — Auto-scroll the active tab into view when the page loads or tab changes**  
  ```ts
  useEffect(() => {
    const activeBtn = scrollRef.current?.querySelector('[data-active="true"]');
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);
  ```
  Add `data-active={selected}` to each tab button.

- [ ] **Step 4 — Hide the native scrollbar (already in the style above)**  
  The `scrollbarWidth: 'none'` style hides the scrollbar on Firefox.  
  Add a CSS class `.hide-scrollbar::-webkit-scrollbar { display: none; }` or use Tailwind `scrollbar-hide` plugin.

- [ ] **Step 5 — Test on mobile**  
  - Open DevTools → toggle device mode to iPhone 12 (390px wide).  
  - The tab strip should show 3–4 tabs.  
  - A right fade gradient and scroll arrow should be visible.  
  - Scroll right → "Integrations", "Plans", "Email" tabs appear.

- [ ] **Step 6 — Test active tab auto-scroll**  
  - Directly navigate to `/dashboard/settings` with a deep-link to the Email tab  
    (e.g. by clicking "View in Email tab" from another page).  
  - The tab strip should auto-scroll to show the Email tab button.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add scroll fade gradients and arrow buttons to tab strip on mobile"
  ```

---

## Acceptance Criteria
- On screens narrower than ~900px, left/right fade gradients appear at the edges of the tab strip.
- Scroll arrow buttons appear when content extends beyond the visible area.
- Clicking the arrows smoothly scrolls the tab list.
- The active tab auto-scrolls into view when the page loads.
- No native scrollbar is visible within the tab strip.
