## 2026-06-24 - Array Spread Bottleneck in Loops
**Learning:** Using the array spread operator (`[...existing, newItem]`) inside loops when manually grouping database records creates O(N²) memory reallocation and becomes a major bottleneck for large datasets (like products with many variants).
**Action:** Mutate arrays directly using `.push()` instead of spreading to prevent O(N²) scaling issues.
