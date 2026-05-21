## 2025-05-21 - Fix Timing Leak in timingSafeEqual Wrapper
**Vulnerability:** The signature verification wrappers (`verifyFlouciSignature` and `verifyKonnectSignature`) caught errors from `crypto.timingSafeEqual` instead of checking buffer length. This can leak timing info (since throwing an exception takes longer) and causes relying on exceptions for flow control.
**Learning:** `crypto.timingSafeEqual` natively throws an error if input buffers have different lengths.
**Prevention:** Always verify buffer lengths explicitly `a.length === b.length` before calling `crypto.timingSafeEqual`.
