## 2024-05-24 - Node.js Metrics Bottleneck
**Learning:** In high-traffic Node.js applications, using Arrays and `array.find()` for stateful, high-cardinality metric lookups (like Prometheus histograms/counters) creates a hidden O(N) CPU bottleneck on every request.
**Action:** Always use `Map` objects with stringified keys for O(1) metric lookups.
