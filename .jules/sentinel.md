## 2024-05-24 - Exception-based DoS in timingSafeEqual
**Vulnerability:** Found `crypto.timingSafeEqual` relying on `try...catch` to handle buffer length mismatches in webhook signature verification.
**Learning:** In Node.js, `timingSafeEqual` throws a `TypeError` for mismatched buffer lengths. Relying on exception-based control flow instead of explicit checks creates a significant performance bottleneck that can be abused for a Denial of Service (DoS) attack, as throwing exceptions is very slow. It also introduces potential subtle timing differences in error handling.
**Prevention:** Always verify `buffer.length === expected.length` before passing them to `timingSafeEqual`, and return `false` gracefully.
