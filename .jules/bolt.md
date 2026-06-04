## 2024-06-04 - Optimize array mutation in loops
**Learning:** In the PandaMarket codebase, large variants mappings previously used array spread operator [...existing, newItem] inside loops, which led to severe O(N^2) memory reallocation bottlenecks.
**Action:** Replace spread operators with direct .push() mutations in mapped array population loops to optimize backend performance.
