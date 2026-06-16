## 2024-06-13 - O(N^2) Array Spread Bottleneck in Data Aggregation
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside loops when mapping database rows to parent objects (like variants to products) causes severe O(N^2) memory reallocation and slows down processing significantly.
**Action:** Always mutate arrays directly using `.push()` when grouping or aggregating raw database records inside a loop to maintain O(N) performance.
