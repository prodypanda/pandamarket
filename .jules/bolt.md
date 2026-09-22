## 2025-02-23 - State Metrics Lookup Optimization
**Learning:** Using `Array.find()` for high-cardinality stateful metrics (like Prometheus HTTP duration histograms and request counters) creates an O(N) lookup bottleneck on every HTTP request as the number of unique label combinations grows.
**Action:** Always use `Map` with stringified label keys for O(1) lookups when storing dynamic/high-cardinality stateful data that must be queried frequently.
