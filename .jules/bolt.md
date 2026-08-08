## 2024-05-15 - Fast Metrics Tracking Using Map
**Learning:** O(N) array search inside a metrics middleware executed on every request quickly becomes a bottleneck as cardinality (number of unique endpoints/statuses) increases. Array.find() causes CPU spikes for high cardinality.
**Action:** Always use a Map or Set object with unique string keys for stateful O(1) lookups on every request, especially for high-cardinality data.
