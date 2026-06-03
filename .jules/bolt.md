## 2025-02-18 - [O(N^2) Array Spread in DB Result Mapping]
**Learning:** [Using the array spread operator `[...existing, newItem]` within loops mapping flat raw SQL result sets into grouped hierarchy objects creates a severe (N^2)$ memory reallocation bottleneck, slowing down queries returning many rows.]
**Action:** [Always use direct mutation, such as `.push()`, when manually grouping or aggregating raw SQL database records within loops, instead of creating new arrays on each iteration.]
