## 2025-02-15 - O(1) Maps for high-cardinality metrics
**Learning:** In Node.js backend performance, storing stateful, high-cardinality data like metrics or counters in Arrays and searching them linearly (e.g., `array.find()`) on every request creates an O(N) bottleneck that severely degrades performance as metrics grow.
**Action:** Always use `Map` objects with unique string keys for O(1) lookups on high-frequency state lookups.
