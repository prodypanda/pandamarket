## 2026-06-02 - Timing Side-Channels & DoS in Cryptographic Checks
**Vulnerability:** Timing side-channel via exception-based control flow (`try...catch`) around `crypto.timingSafeEqual` and a Denial of Service (DoS) risk from array inputs passed to `Buffer.from()`.
**Learning:** Node.js `crypto.timingSafeEqual` throws an exception if buffers are different lengths, which developers often catch, unintentionally creating a timing leak via error handling. Additionally, passing an array to `Buffer.from()` throws a TypeError which can crash the server if unhandled.
**Prevention:** Explicitly validate that header values are strings before parsing. Ensure buffer lengths match (`a.length === b.length`) before calling `timingSafeEqual` instead of using `try...catch` to handle mismatched lengths.
