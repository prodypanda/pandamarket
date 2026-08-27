# Engineering Specification: PLAN-M-08
## Dedicated Seller Order Management & Fulfillment Pipeline API

- **Target PRD Gap:** [M-08](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-08)
- **Severity:** 🟡 PRD Gap / Seller Operations
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Store Route, Seller Dashboard Orders Page, Fulfillment Tracker.

---

### 1. Summary & Business Impact
Vendors currently query orders via complex multi-table joins on `/me/store`. There is no dedicated endpoint for paginated vendor orders with customer contact details, tracking numbers, packing slips, and per-item fulfillment status. This plan builds `GET /api/pd/seller/orders` with filterable statuses (`pending`, `processing`, `shipped`, `delivered`, `returned`).

---

### 2. Implementation Details
1. Endpoint: `GET /api/pd/seller/orders` supporting `status`, `date_from`, `date_to`, `page`, `limit`.
2. Endpoint: `PATCH /api/pd/seller/orders/:id/fulfill` accepting `tracking_number`, `carrier_name` (Aramex, Yalidine, First Delivery, etc.).
3. Emits `PdEvent.ORDER_SHIPPED` to send tracking link to customer.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/seller-orders.test.ts
```
