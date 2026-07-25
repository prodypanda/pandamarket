## 2026-07-25 - Fix DoS risk in webhook signature verification
**Vulnerability:** Node.js `crypto.timingSafeEqual` throws a `RangeError` if the input buffers have different lengths, causing exceptions to be caught. Under high load of malformed signatures, this try/catch control flow can cause CPU exhaustion (DoS). Additionally, req.headers values can be arrays, causing TypeErrors when passed to Buffer.from.
**Learning:** Generating stack traces for frequent exceptions is a performance anti-pattern. Exception-based control flow should not be relied upon for expected invalid inputs like signatures.
**Prevention:** Always explicitly validate that headers are strings and verify that `buf1.length === buf2.length` before calling `crypto.timingSafeEqual` to prevent unhandled exceptions.
