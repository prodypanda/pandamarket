## 2026-07-29 - State metrics bottleneck
**Learning:** Arrays that grow with application metrics (like HTTP statuses per route) create an O(N) lookup bottleneck when intercepted on every single request. Using Array.prototype.find here is an anti-pattern under load for high cardinality labels.
**Action:** Always use Maps with unique string keys for O(1) state lookups, especially in middleware that runs on every request.
