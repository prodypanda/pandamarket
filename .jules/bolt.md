## 2026-05-24 - Optimize Bulk Import N+1 Queries
**Learning:** In bulk operations handling arrays of items (like CSV imports parsed into JSON arrays), fetching identical tenant/store configuration on every iteration creates massive N+1 query bottlenecks that can overload the database.
**Action:** Always fetch tenant/store context once before entering the processing loop, especially when the context is invariant for the duration of the request.
