## 2026-07-02 - Buffer length check missing before timingSafeEqual
**Vulnerability:** Missing explicit buffer length check before invoking `crypto.timingSafeEqual` for HMAC signature verification in Flouci and Konnect webhooks.
**Learning:** `crypto.timingSafeEqual` throws a `RangeError` if the input buffers have different byte lengths. Relying on exception-based control flow (`try...catch`) to handle this expected invalid input can lead to performance bottlenecks and CPU exhaustion under spam attacks.
**Prevention:** Always explicitly verify that `buf1.length === buf2.length` before calling `crypto.timingSafeEqual` to prevent unhandled exceptions and potential Denial of Service (DoS) vulnerabilities.
