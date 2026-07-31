## 2026-07-31 - [O(N) Metric Middleware Lookups]
**Learning:** [Using \`array.find\` with \`JSON.stringify\` on every request for collecting metrics causes an O(N) lookup bottleneck that grows linearly with unique routes and status codes, consuming CPU cycles and event loop lag.]
**Action:** [Use a \`Map\` with stringified keys for O(1) lookups of stateful, high-cardinality data on high-frequency paths like request middlewares.]
