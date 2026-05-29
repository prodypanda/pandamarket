## 2024-05-29 - [Exception-Based Control Flow in Timing Safe Operations]
**Vulnerability:** Exception handling `TypeError` during `crypto.timingSafeEqual` introduces a side-channel timing attack.
**Learning:** `crypto.timingSafeEqual` natively throws a `TypeError` if input buffers do not have identical byte lengths. Catching this exception with a `try...catch` block creates a measurable timing difference between signature checks with matching vs non-matching lengths.
**Prevention:** Always verify buffer lengths explicitly using `a.length === b.length` before attempting any cryptographic timing safe comparisons. Do not rely on error handling to control execution flow for cryptographic operations.
