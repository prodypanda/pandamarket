## 2025-02-20 - Avoid O(N^2) memory reallocation in arrays
**Learning:** Using the spread operator (`[...existing, item]`) to append items to an array inside a loop causes severe O(N^2) memory reallocation bottlenecks. This was seen in `product.service.ts` when grouping product variants.
**Action:** Use direct mutation with `.push()` when appending items to an array within a loop to ensure O(N) performance.
