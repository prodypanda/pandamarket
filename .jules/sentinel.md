
## 2024-06-13 - [Prevent TypeErrors and Timing Side-Channels in HMAC Verification]
**Vulnerability:** Signature verification functions (`verifyFlouciSignature`, `verifyKonnectSignature`) assumed `req.headers` would always be a string and used `try...catch` around `crypto.timingSafeEqual` to handle length mismatch errors. This could cause uncaught `TypeError`s if headers were arrays, leading to potential DoS, and relying on exceptions for flow control masks upstream input validation issues.
**Learning:** `req.headers` in Express can return an array, and passing it to `Buffer.from()` might throw uncaught TypeErrors. `crypto.timingSafeEqual` requires buffers of the same length and throws otherwise; capturing this via `try...catch` hides these length mismatch flaws instead of properly validating the input length beforehand.
**Prevention:** Explicitly check that `typeof header === 'string'` and compare `Buffer.length` prior to executing `crypto.timingSafeEqual`.
