
## 2026-06-07 - Fix exception-based control flow and DoS in webhook HMAC verification
**Vulnerability:** `crypto.timingSafeEqual` natively throws a `TypeError` when input buffers have different lengths, and passing arrays (from `req.headers`) to `Buffer.from` causes uncaught exceptions, leading to DoS.
**Learning:** `try...catch` around `timingSafeEqual` introduces timing side-channels. `req.headers` can be an array, which crashes `Buffer.from()` if unchecked.
**Prevention:** Always validate that headers are strings (`typeof header === 'string'`) before passing to `Buffer.from()`, and explicitly compare buffer lengths (`a.length === b.length`) before using `crypto.timingSafeEqual` instead of relying on `try...catch`.
