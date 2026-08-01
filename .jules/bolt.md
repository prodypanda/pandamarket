## 2026-08-01 - Avoid O(N) array lookups for high-cardinality metrics
**Learning:** Storing high-cardinality data (like metrics or counters) in Arrays and searching them linearly (e.g., `array.find()`) on every request creates an O(N) bottleneck, especially when using operations like `JSON.stringify()` in the predicate.
**Action:** Use `Map` objects with unique string keys for O(1) lookups to avoid O(N) bottlenecks in request paths.
