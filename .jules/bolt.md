## 2024-05-18 - [Combine and memoize component-level array calculations]
**Learning:** Calculating metrics by chaining `.filter().length` and `.reduce()` multiple times outside `useMemo` runs on *every* state update (like character typing in a search bar), leading to unnecessary CPU overhead. Doing multiple passes is especially bad.
**Action:** Combine multiple iterations into a single O(n) `.reduce()` and wrap them in a `useMemo` dependency array (e.g. `[products]`) so metrics are only recalculated when the underlying data changes, not on unrelated local state updates.
