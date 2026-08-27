# 11 · What is Genuinely Well Built

[← Index](./00-README.md) · Prev: [10 Evidence](./10-EVIDENCE-AND-METHOD.md) · Next: [12 Gaps](./12-VERIFICATION-GAPS.md)

Worth stating plainly, because it shapes where effort should go. These systems represent strong architectural assets that should not be refactored or rewritten.

## Appendix — what is genuinely well built

Worth stating plainly, because it shapes where effort should go:

- **Checkout.** `order.service.ts:374-878` is the strongest code in the repo: advisory-lock idempotency serialising same-key attempts, deterministic ascending `FOR UPDATE` on products and variants to avoid deadlocks, quote version + payment-capability pinning, guarded atomic stock decrements with `RETURNING` checks, `FOR UPDATE SKIP LOCKED` license-key claiming, `ON CONFLICT (idempotency_key) DO NOTHING` with a replay path, and per-store fulfilment creation.
- **Payment capture.** Amount and currency verified in minor units against the locked expectation, merchant-account match check, attempt + order captured in one transaction with `FOR UPDATE`, duplicate/failed event states recorded distinctly, and defence-in-depth rejection at the service layer.
- **Report case authorization.** `report.service.ts` filters messages *and* attachments by audience visibility, scopes by owner, returns 404 rather than 403, validates that a reported order involves both parties, and `canAccessAttachmentKey` checks role + store + target type + visibility together. This is the model chat and support should be brought up to.
- **Constant-time comparisons.** Every HMAC/secret comparison uses `timingSafeEqual` with a length pre-check, or a correct hand-rolled loop.
- **Token generation.** All single-use tokens use `randomBytes(32)`+ and are stored as SHA-256 digests, never plaintext.
- **Config fail-fast.** `config.ts:197-238` refuses to boot in production on dev-default JWT/cookie/encryption secrets or public sandbox payment credentials, with a deliberate `PD_ALLOW_SANDBOX_PAYMENTS` escape hatch.
- **Migration runner.** `pg_advisory_lock` around the whole run so concurrent boots queue instead of half-migrating, per-migration transactions, duplicate-prefix detection with a documented rationale for warning rather than aborting.
- **SSRF defence on webhooks.** `validateWebhookUrl` re-run at delivery time specifically to defeat DNS rebinding, `redirect:'manual'`, 3xx treated as error, 10 s abort.
- **Email delivery honesty.** `email.worker.ts:618-644` refuses to report success for an undelivered production email, with a comment explaining that the previous silent-success path made password resets vanish. Exactly the right call — and the one SMS still needs.
- **Rate-limit store.** The header comment documents a real production incident (`rate-limit-redis` crashing the process on a cold-Redis boot) and the replacement does no I/O at construction.
- **i18n catalogues.** EN/FR/AR at 3,046 keys each, zero missing, zero orphaned, zero empty, with a parity regression test. The gap is entirely unwired UI, not missing translations.
- **Audit-log redaction.** `redactBody` normalises separators, recurses nested objects and arrays, and covers a broad provider-specific pattern list. The gap is the URL, not the body.

---
