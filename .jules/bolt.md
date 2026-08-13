## 2024-08-13 - Replace O(N) array search with O(1) Map lookup for HTTP metrics
**Learning:** In backend stateful logic (like metrics), storing items in an array and looking them up using `.find()` on every request is a severe performance bottleneck (O(N) operation per request).
**Action:** Use a `Map` to look up elements in O(1) time utilizing unique string keys.
