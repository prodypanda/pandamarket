## 2026-05-22 - Timing Leak in Webhook Signature Verification
**Vulnerability:** Potential timing leak via exception handling in `crypto.timingSafeEqual` when buffers have different lengths in payment webhook signature verifications.
**Learning:** `crypto.timingSafeEqual` natively throws a TypeError if lengths mismatch. Relying on `catch` block to handle this can still introduce subtle timing variances an attacker might measure.
**Prevention:** Always verify buffer lengths explicitly (`if (a.length !== b.length) return false`) before invoking `timingSafeEqual`.
