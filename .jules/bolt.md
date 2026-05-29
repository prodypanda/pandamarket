## 2024-05-29 - O(N^2) memory reallocation in array spread
**Learning:** Using array spread operator `[...existing, newItem]` inside a loop to group database rows causes severe O(N^2) memory reallocation bottlenecks, especially when processing many records like product variants.
**Action:** When manually grouping or aggregating raw SQL database records in loops, mutate arrays directly using `.push()` instead to achieve O(N) performance.
