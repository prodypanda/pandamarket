## 2026-08-03 - O(N) array lookups in metrics collection
**Learning:** Discovered a performance bottleneck where HTTP request metrics were using `Array.find` with JSON-stringified keys on every single request. This creates an O(N) lookup bottleneck that degrades performance under load.
**Action:** Always use `Map` objects with string keys for O(1) lookups when dealing with stateful, high-cardinality data like metrics or counters.
