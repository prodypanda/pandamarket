## 2026-06-27 - [CRITICAL/HIGH] Fix DoS vulnerability in HMAC signature verification
**Vulnerability:** Unhandled TypeError from array headers and performance degradation from exception-based control flow in `crypto.timingSafeEqual` length mismatch.
**Learning:** `req.headers` can return an array, causing `Buffer.from()` to throw a `TypeError`. Furthermore, relying on `try...catch` for expected invalid lengths when using `timingSafeEqual` leads to CPU exhaustion under spam attacks.
**Prevention:** Always validate that headers passed to `Buffer.from()` are of type `string`, and explicitly verify `buf1.length === buf2.length` before calling `timingSafeEqual`.
