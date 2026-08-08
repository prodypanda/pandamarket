## 2024-08-06 - Optimize metrics storage with Map lookups
**Learning:** Array `.find` operations inside middleware that run on every HTTP request can become an $O(N)$ performance bottleneck as unique routes/labels grow.
**Action:** Use `Map` lookups instead for $O(1)$ metric retrieval in high-frequency paths like HTTP middlewares.
