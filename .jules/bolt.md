## 2024-05-28 - [Fix O(N^2) array spread bottleneck]
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside loops when mapping relational objects (like grouping variants by product) causes severe O(N^2) memory reallocation bottlenecks in Node.js.
**Action:** Always mutate local arrays directly using `.push()` when manually grouping or aggregating raw SQL database records in loops to maintain O(N) performance.
