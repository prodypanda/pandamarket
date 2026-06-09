## 2024-05-18 - Avoid array spread operator in loops
**Learning:** Using the array spread operator `[...existing, newItem]` inside a loop to aggregate records (like attaching variants to products) causes a severe O(N^2) memory reallocation bottleneck.
**Action:** Mutate arrays directly using `.push()` instead.
