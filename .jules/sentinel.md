## 2024-05-24 - crypto.timingSafeEqual Buffer Length Mismatch Exception
**Vulnerability:** Calling `crypto.timingSafeEqual(a, b)` natively throws a `TypeError` if `a.length !== b.length`. This can be leveraged for timing attacks or denial of service by triggering exceptions during signature verification.
**Learning:** Exception-based control flow leaks information about the input and can crash unhandled processes. Native crypto functions in Node.js often have strict input validation that differs from generic comparison functions.
**Prevention:** Always verify that input buffers are of exactly the same length (`a.length === b.length`) before executing the comparison, returning `false` early if they differ.
