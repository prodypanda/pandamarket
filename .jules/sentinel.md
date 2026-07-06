## 2026-07-06 - Prevent DoS from Exception-Based Cryptographic Validation
**Vulnerability:** Webhook signature verification used `try/catch` around `crypto.timingSafeEqual` to handle mismatched buffer lengths.
**Learning:** Node.js `crypto.timingSafeEqual` throws a `RangeError` if inputs have different byte lengths. Relying on exception handling for this creates a CPU exhaustion bottleneck (DoS risk) under spam attacks. Additionally, missing `typeof === 'string'` checks on HTTP headers could lead to unhandled TypeErrors if headers are arrays.
**Prevention:** Explicitly validate inputs (e.g., check `typeof header === 'string'` and `buf1.length === buf2.length`) to prevent exceptions from being thrown before calling cryptographic functions.
