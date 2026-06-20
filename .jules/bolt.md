## 2024-06-13 - Array Spread in Loops Memory Bottleneck
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside a loop to group items (like variants by product) causes an O(N^2) memory reallocation bottleneck when handling many rows.
**Action:** Always mutate arrays directly using `.push()` when manually grouping or aggregating raw SQL database records in a loop.
