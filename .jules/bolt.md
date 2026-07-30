## 2026-07-30 - O(N) Bottlenecks in High-Frequency Middleware
**Learning:** Storing high-cardinality state (like Prometheus metric labels) in Arrays and using `Array.find()` with `JSON.stringify` inside Express middleware creates a severe O(N) performance bottleneck because it executes on every single HTTP request.
**Action:** Always use `Map` objects with unique string keys for O(1) lookups when tracking stateful, high-cardinality data on hot paths like request metrics.
