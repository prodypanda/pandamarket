## 2024-06-13 - Array Spread Bottleneck in Data Aggregation
**Learning:** Using array spread operator (`[...existing, new]`) inside a loop to aggregate raw database records (like product variants) causes severe O(N^2) memory reallocation bottlenecks.
**Action:** Mutate arrays directly using `.push()` when manually grouping or aggregating raw SQL database records in loops.
