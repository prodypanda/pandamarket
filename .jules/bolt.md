## 2026-06-28 - Avoid O(N^2) Memory Reallocation in Loops
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside loops when manually grouping or aggregating database records causes O(N^2) memory reallocation bottlenecks, severely degrading performance for large datasets.
**Action:** Mutate arrays directly using `.push()` when grouping or aggregating records in loops instead of creating new arrays on every iteration.
