## 2025-05-23 - Prevent Exception-Based Control Flow in HMAC Verification
**Vulnerability:** `crypto.timingSafeEqual` natively throws an error for mismatching buffer lengths. Relying on a `try...catch` block to handle this can create minor timing or DoS leaks via error handling overhead.
**Learning:** Checking buffer lengths explicitly before `timingSafeEqual` provides a safer and cleaner way to reject invalid signatures without engaging exception handling logic.
**Prevention:** Always verify buffer lengths explicitly using `.length` before passing them to `timingSafeEqual`.
