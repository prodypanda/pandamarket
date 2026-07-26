## 2026-07-26 - High-cardinality metrics O(N) array search bottleneck
**Learning:** Storing high-cardinality stateful metrics (like Prometheus HTTP request duration histograms, counters) in an array and linearly searching them with `array.find((m) => JSON.stringify(m.labels) === key)` on every single request creates an O(N) CPU bottleneck under load, severely slowing down the request lifecycle.
**Action:** Always use `Map` objects with stringified keys for O(1) lookups when aggregating or accessing high-cardinality state data on the hot path (like Express middleware).
