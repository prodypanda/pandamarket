## 2024-06-13 - O(N^2) Array Spread Bottleneck
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside loops when aggregating raw SQL database records causes severe O(N^2) memory reallocation bottlenecks.
**Action:** Always mutate arrays directly using `.push()` when grouping or aggregating records in loops instead of creating new arrays with the spread operator.
