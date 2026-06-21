## 2024-06-13 - Optimize attachVariants array allocation
**Learning:** Avoid using the array spread operator inside loops when manually grouping or aggregating SQL database records, as it leads to O(N^2) memory reallocation bottlenecks.
**Action:** Mutate arrays directly using `.push()` when grouping records by ID.
