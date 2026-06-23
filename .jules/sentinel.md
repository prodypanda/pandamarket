## 2024-06-13 - [Buffer timingSafeEqual Exceptions]
**Vulnerability:** Application uses exception handling instead of buffer length checks around `crypto.timingSafeEqual()`.
**Learning:** `crypto.timingSafeEqual()` throws exceptions when buffer lengths differ, opening the door for Denial of Service if malicious inputs force exceptions to be repeatedly caught.
**Prevention:** Validate that input buffers have the exact same length and that header values are strings before calling `timingSafeEqual()`.
