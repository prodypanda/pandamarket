## 2026-07-26 - Prevent DoS in HMAC Verification
**Vulnerability:** crypto.timingSafeEqual throws RangeError on mismatched buffer lengths. Relying on catch blocks for expected invalid signatures leads to CPU exhaustion via stack trace generation.
**Learning:** Always validate buffer lengths before calling timingSafeEqual to avoid exception-based control flow performance anti-patterns.
**Prevention:** Ensure buf1.length === buf2.length is checked explicitly before using crypto.timingSafeEqual.
