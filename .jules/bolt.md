## 2024-08-09 - O(N) Array Lookup Bottleneck in Metrics Middleware
**Learning:** Storing high-cardinality state (like HTTP request metrics) in Arrays and searching them linearly using `.find()` and `JSON.stringify()` on every request creates a significant O(N) performance bottleneck in Node.js applications.
**Action:** Always use `Map` objects with unique string keys for O(1) lookups when caching or tracking state that is accessed frequently, especially in middleware that runs on every request.
