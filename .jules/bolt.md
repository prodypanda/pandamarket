## 2026-08-02 - O(N) Array Lookup in High-Cardinality Metrics
**Learning:** In Node.js/Express, linearly searching arrays in middleware on every request is disastrous for performance when the metric cardinality grows. Specifically, iterating over metric arrays using `array.find()` with `JSON.stringify()` inside the event loop creates a silent O(N) bottleneck that severely degrades HTTP throughput under load.
**Action:** Always use `Map` with stringified keys for O(1) lookups in stateful, high-frequency code paths like metrics collection or caching to maintain predictable latency.
