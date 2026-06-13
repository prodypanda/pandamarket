## 2024-05-31 - [Timing Leak & DoS in Webhook Verification]
**Vulnerability:** Exception-based handling in `crypto.timingSafeEqual` and unchecked `req.headers` array inputs.
**Learning:** `crypto.timingSafeEqual` throws a `TypeError` if buffer lengths differ, which can be distinguished in time from a safe comparison, re-introducing timing leaks. Additionally, passing an array from `req.headers` to `Buffer.from()` triggers an uncaught exception, leading to potential DoS.
**Prevention:** Always explicitly verify `typeof header === 'string'` and compare `Buffer.length` explicitly before invoking `timingSafeEqual`.
