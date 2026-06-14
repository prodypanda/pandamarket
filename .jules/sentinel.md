## 2024-06-13 - [Fix timing attack vulnerability in HMAC signature verification]
**Vulnerability:** Exception-based control flow via try...catch around crypto.timingSafeEqual was leaking timing information when buffer lengths mismatched. Also, unsanitized req.headers (which can be string arrays) were passed to Buffer.from(), leading to potential DoS.
**Learning:** crypto.timingSafeEqual inherently throws TypeErrors on mismatching lengths, requiring manual length checking prior to comparison to avoid side channels. Express headers must be validated as type string to avoid TypeErrors.
**Prevention:** Always check buffer lengths before calling timingSafeEqual, and validate that headers are strictly typeof string before passing them to Buffer.from().
