## 2024-05-18 - Avoid array spread operator in loops mapping raw SQL results
**Learning:** Using `[...(existing ?? []), newItem]` inside a loop to group raw database results causes severe O(N^2) memory reallocation and garbage collection bottlenecks when processing large datasets (e.g., mapping hundreds of variants to products).
**Action:** Always mutate arrays directly using `.push()` when manually grouping or aggregating raw SQL database records in loops to ensure O(1) appends and O(N) overall complexity.
