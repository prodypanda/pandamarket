## 2024-06-13 - [Uncaught Exceptions in timingSafeEqual]
**Vulnerability:** DoS vulnerability where `Buffer.from()` and `crypto.timingSafeEqual()` could throw uncaught exceptions if `req.headers` was passed as a string array or mismatched byte lengths were compared.
**Learning:** `req.headers` in Express can be an array of strings, leading to TypeError in strict functions, while `timingSafeEqual` crashes if buffers differ in length.
**Prevention:** Always validate header inputs as single strings (`typeof input === 'string'`) and ensure buffer length equality before calling `timingSafeEqual()`.
