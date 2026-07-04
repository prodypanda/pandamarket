## 2026-07-04 - Array Spread in Loop Performance Anti-Pattern
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside loops when manually aggregating SQL database records into a Map causes an O(N^2) memory reallocation bottleneck due to continuous array recreation.
**Action:** Always mutate arrays directly using `.push()` when grouping or aggregating database rows, as it prevents memory exhaustion and improves execution speed significantly.
