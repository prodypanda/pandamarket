## 2024-06-13 - [Optimize grouping variants]
**Learning:** When manually grouping or aggregating raw SQL database records in loops (e.g., mapping variants to products), using the array spread operator (`[...existing, newItem]`) inside the loop causes severe O(N^2) memory reallocation bottlenecks.
**Action:** Mutate arrays directly using `.push()` instead to optimize performance.
