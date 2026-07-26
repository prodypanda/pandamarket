## 2026-07-26 - [O(1) lookups for stateful backend data]
**Learning:** Found an O(N) performance bottleneck in the backend metrics middleware where stateful high-cardinality data (`httpDurationHistograms` and `httpRequestCounters`) were stored in Arrays and searched linearly using `.find()` on every request. This caused significant performance degradation for applications with many unique routes or metric labels.
**Action:** Use `Map` objects with unique string keys for O(1) lookups instead of Arrays for stateful, high-cardinality data to prevent CPU exhaustion and ensure optimal performance.
