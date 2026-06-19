## 2026-06-19 - Optimize map grouping operations
**Learning:** Using the array spread operator `[...existing, newItem]` to group array values inside a loop causes severe $O(N^2)$ memory reallocation and garbage collection overhead.
**Action:** Always mutate grouped arrays directly using `.push()` when collecting elements inside loops to maintain $O(N)$ efficiency.
