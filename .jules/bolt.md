## 2026-08-19 - O(1) Lookups for Metrics Data Structures
**Learning:** In Node.js backends tracking high-cardinality stateful metrics (like Prometheus request counters), using Arrays and searching them linearly with `Array.find()` creates an O(N) bottleneck on every request.
**Action:** Always use `Map` objects with unique string keys for O(1) lookups to maintain performance as unique data combinations grow.
