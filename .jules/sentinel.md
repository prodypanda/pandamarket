## 2026-05-27 - Fix timingSafeEqual exception-based control flow
**Vulnerability:** Use of `try...catch` around `crypto.timingSafeEqual` for strings of different lengths.
**Learning:** In Node.js, `crypto.timingSafeEqual` inherently throws a `TypeError` if buffers are not of equal length. Relying on `try...catch` to handle this introduces a significant performance overhead that an attacker could potentially exploit for an asymmetric Denial of Service (DoS) attack, and represents poor cryptographic hygiene.
**Prevention:** Always explicitly check buffer lengths using `a.length === b.length` before invoking `crypto.timingSafeEqual`, returning early if they differ.
