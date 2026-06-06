## 2024-06-06 - [Avoid O(N^2) memory reallocation in aggregation loops]
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside loops when aggregating database records causes severe O(N^2) memory reallocation bottlenecks in Node.js/V8.
**Action:** Always use `.push()` to mutate arrays directly when grouping or mapping over raw SQL database rows.
