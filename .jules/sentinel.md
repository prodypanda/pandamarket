## 2026-06-25 - Prevent DoS from timingSafeEqual Buffer Length Mismatch
**Vulnerability:** Node.js `crypto.timingSafeEqual` was used to compare HMAC signatures without verifying that both `Buffer` objects had the exact same length. If a malformed signature with a different length is provided, a `RangeError` exception is thrown.
**Learning:** Relying on `try...catch` blocks to swallow expected validation errors is a performance anti-pattern. Generating stack traces for frequent exceptions could lead to CPU exhaustion during spam attacks.
**Prevention:** Always explicitly verify that `bufferA.length === bufferB.length` before invoking `timingSafeEqual` to prevent unhandled exceptions and minimize performance penalties.
