## 2024-05-24 - O(1) Metrics Lookup
**Learning:** In highly trafficked applications, using `Array.prototype.find` paired with `JSON.stringify` on every single incoming HTTP request for metrics tracking creates an unnecessary O(N) bottleneck that linearly degrades as more metric permutations (labels) are tracked.
**Action:** Utilize a `Map` structure with stringified keys for O(1) constant-time lookups to maintain consistent performance regardless of metrics cardinality.
