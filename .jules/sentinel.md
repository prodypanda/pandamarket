## 2026-06-29 - DoS Vulnerability in Webhook Signature Verification
**Vulnerability:** Webhook handlers relied on try...catch around crypto.timingSafeEqual which throws a RangeError for mismatched buffer lengths, and failed to check if the header was an array, which could throw a TypeError.
**Learning:** Exception-based control flow for expected invalid inputs (such as malformed cryptographic signatures) is a performance anti-pattern. req.headers can return arrays, which breaks Buffer.from().
**Prevention:** Explicitly validate inputs by checking typeof header === 'string' and verifying buf1.length === buf2.length before calling timingSafeEqual to prevent exceptions.
