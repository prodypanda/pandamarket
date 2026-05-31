## 2024-05-31 - Array spread operator O(N^2) memory reallocation bottleneck in loops

**Learning:** When manually grouping or aggregating raw SQL database records in loops (like mapping variants to products in `product.service.ts`), using the array spread operator (`[...existing, newItem]`) inside the loop causes a severe $O(N^2)$ memory reallocation bottleneck. Every iteration creates a new array and copies all previous elements.

**Action:** Always mutate arrays directly using `.push()` instead of the spread operator when accumulating elements inside a loop to keep time complexity at $O(N)$ and prevent unnecessary memory allocations.
