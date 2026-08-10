## 2024-08-11 - Promise.all instead of for...await loop in Menu Service
**Learning:** Sequential await in a for...of loop when querying multiple independent menu items creates a severe N+1 latency bottleneck.
**Action:** Replace for...of loops with Promise.all mapping to concurrently fetch or process independent data when iterating over arrays in services.
