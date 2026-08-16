## 2024-08-16 - O(N) Array.find() bottleneck in Prometheus metrics
**Learning:** Storing high-cardinality metrics (like HTTP request durations with dynamic routes/status codes) in Arrays and using `Array.find()` with `JSON.stringify` on every single request creates a significant O(N) CPU bottleneck that degrades performance linearly as more routes are accessed.
**Action:** Always use `Map` objects with pre-stringified keys for O(1) lookups when aggregating stateful, high-cardinality data (like counters or histograms) in memory across requests.
