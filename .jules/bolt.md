## 2024-05-25 - [Backend] Fix N+1 query in bulk product import
**Learning:** Found a severe N+1 query bottleneck specific to bulk operations (like CSV/JSON imports) where invariant context such as store details was being fetched inside the processing loop, potentially causing hundreds of unnecessary database queries for a single request.
**Action:** When optimizing bulk operations, ensure invariant context (like tenant or store details) is fetched once outside the processing loop.
