## 2026-07-03 - [RangeError DoS in HMAC Verification]
**Vulnerability:** Uncaught RangeError when `crypto.timingSafeEqual` is called with buffers of different lengths.
**Learning:** Node.js `timingSafeEqual` requires equal length buffers. Relying on `try/catch` without checking length leads to DoS since it doesn't catch the `RangeError` if the caller inputs a different length hex string.
**Prevention:** Always verify `buf1.length === buf2.length` before calling `crypto.timingSafeEqual`.
