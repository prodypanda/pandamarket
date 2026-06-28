## 2026-06-28 - Fix DoS via TypeErrors and RangeErrors in Signature Verification
**Vulnerability:** Unhandled buffer length mismatch and potential array types in headers could lead to thrown exceptions during webhook signature verification, posing a DoS risk if spammed.
**Learning:** Relying on `try...catch` for expected invalid inputs (like malformed signatures or length mismatches) is a performance anti-pattern. Generating stack traces for frequent exceptions can lead to CPU exhaustion.
**Prevention:** Always validate input types (e.g., `typeof header === 'string'`) and explicitly check `buf1.length === buf2.length` before calling `crypto.timingSafeEqual`.
