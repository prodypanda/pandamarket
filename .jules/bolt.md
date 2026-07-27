## 2026-07-27 - O(N) Array finds in hot paths
**Learning:** Using Array.find() with JSON.stringify() inside Express middleware for metrics tracking creates an O(N) lookup bottleneck on every single request as the number of unique metric label combinations grows.
**Action:** Always use Map objects with unique string keys for O(1) lookups in high-frequency paths like middleware or loops.
