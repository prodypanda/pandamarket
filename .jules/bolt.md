## 2025-05-20 - Memoization of computed properties in MarketplaceStorefront

**Learning:** Unmemoized array operations (`filter`, `reduce`) inside render methods for components that manage store inventory (products and categories) will recalculate on every single render, potentially causing layout trashing and performance degradation, especially as store inventory sizes grow.
**Action:** When filtering or counting large arrays (like products or categories) to derive state within a React component, always wrap the computation in `useMemo` with correctly configured dependency arrays to optimize render performance.
