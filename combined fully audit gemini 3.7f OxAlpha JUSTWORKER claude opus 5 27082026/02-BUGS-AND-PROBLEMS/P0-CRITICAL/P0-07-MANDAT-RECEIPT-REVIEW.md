# P0-07 · MANDAT-RECEIPT-REVIEW

### P0-7 · Storefront Mandat Receipt Review Bypasses markPaidInTransaction
- **Files:** `backend/src/api/payment.route.ts:466-532`
- **Evidence:** Reviewing Mandat receipts runs a raw SQL update, leaving `pd_store_order` un-updated and wallets uncredited.
- **Root Cause:** Raw SQL update instead of `orderService.markPaidInTransaction`.
- **Fix Guide:** See [Guide G](../../06-IMPLEMENTATION-GUIDES/GUIDE-G-MANDAT-RECEIPT-REVIEW.md).
