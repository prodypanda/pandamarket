## 2025-02-12 - Prevent Timing Leaks and DoS in Webhook Signatures
**Vulnerability:** Webhook signatures used `try...catch` around `crypto.timingSafeEqual` and lacked explicit string validation on headers.
**Learning:** `req.headers` can be arrays, potentially crashing `Buffer.from()` or causing unexpected behavior. Catching exceptions from `crypto.timingSafeEqual` introduces a timing side-channel because throwing errors takes measurable time.
**Prevention:** Always validate that headers are single strings (`typeof header === 'string'`). Compare buffer lengths (`a.length === b.length`) before calling `crypto.timingSafeEqual` to avoid native `TypeError` and remove the need for `try...catch`.
