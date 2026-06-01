
## 2024-05-18 - Prevent Timing Leak and Type Errors in Signature Verification
**Vulnerability:** Exception-based control flow timing leak and array `TypeError` risks in HMAC signature validation logic.
**Learning:** `crypto.timingSafeEqual` natively throws an error if buffer lengths mismatch, which can be used to observe response times and leak signature lengths if handled inside a `try...catch` block. Additionally, `req.headers` can be a string array, which would throw an unhandled `TypeError` inside strict type functions like `Buffer.from()` if not validated as a single string.
**Prevention:** Always validate header fields (`typeof header === 'string'`) before parsing. Explicitly check that buffer lengths match (`a.length === b.length`) before calling `crypto.timingSafeEqual` to avoid exception-based timing leaks.
