## 2024-05-26 - [Backend] Array Spread Operator in Loop Avoided for O(N^2) Mitigation

**Learning:** When assigning objects to a Map or combining collections in a loop over large numbers of records (like mapping product variants to products), using the array spread operator `[...existingArray, newItem]` inside the loop can result in O(N^2) time complexity. This can cause severe performance issues when processing large sets of records from a database.

**Action:** Mutate arrays directly (`list.push(variant)`) instead of using the array spread operator to add items to existing collections within loops. This ensures linear time complexity and avoids unnecessary allocations.
