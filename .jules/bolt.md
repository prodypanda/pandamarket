## 2024-08-14 - Replace O(N) Array Lookups with O(1) Map Lookups for Metrics
**Learning:** Storing high-cardinality stateful data (like Prometheus metrics with varied labels) in Arrays and using `.find()` on every request creates an O(N) bottleneck, unnecessarily consuming CPU as the number of unique label combinations grows.
**Action:** Always use `Map` with stringified keys for O(1) lookups on frequently accessed or updated in-memory collections, especially in request-handling middleware.
