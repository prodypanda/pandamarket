## 2024-06-11 - Optimize Array Grouping Memory Reallocation
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside loops for grouping raw SQL records into arrays creates a severe O(N^2) memory reallocation bottleneck.
**Action:** Mutate arrays directly using `.push()` instead when manually grouping or aggregating raw SQL database records in loops.