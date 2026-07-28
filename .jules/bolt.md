## 2026-07-28 - Avoid O(N) Array Lookups for Stateful Metrics
**Learning:** In the Node.js backend, storing high-cardinality data like HTTP request metrics in an Array and searching it linearly (e.g., `array.find()`) on every request creates a significant O(N) CPU bottleneck. This bottleneck worsens as more unique routes/status codes are hit, leading to performance degradation under load.
**Action:** Always use `Map` objects with unique string keys for O(1) lookups when caching or aggregating stateful, high-cardinality data per request.
