## 2026-07-06 - O(1) Lookups for High-Cardinality Metrics
**Learning:** Using `Array.find()` for high-cardinality labels in Prometheus metric stores (like `httpDurationHistograms` and `httpRequestCounters`) causes O(N) array scans on every single HTTP request. This creates a severe performance bottleneck under load as the application processes more unique routes or statuses.
**Action:** Store stateful, high-cardinality data using `Map` objects with unique string keys (e.g., `JSON.stringify(labels)`) to ensure O(1) lookup performance and avoid CPU exhaustion during request processing.
