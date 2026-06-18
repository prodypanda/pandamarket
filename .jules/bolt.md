## 2024-06-13 - O(N^2) Array Spread Bottleneck in Map Loops
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside a loop to aggregate records (e.g., in a `Map`) causes severe O(N^2) memory reallocation and performance issues, particularly for large datasets.
**Action:** Mutate arrays directly using `.push()` when grouping or aggregating records in loops.
