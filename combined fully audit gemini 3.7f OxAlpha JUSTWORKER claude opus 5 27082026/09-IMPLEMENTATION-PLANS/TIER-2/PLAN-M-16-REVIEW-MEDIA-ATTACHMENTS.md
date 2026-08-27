# Engineering Specification: PLAN-M-16
## Verified Customer Review Media Attachments (Photos & Videos)

- **Target PRD Gap:** [M-16](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-16)
- **Severity:** 🟡 PRD Gap / Social Proof & Conversion Optimization
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Reviews Service, Review Upload Endpoint, Product Detail Reviews Tab.

---

### 1. Summary & Business Impact
Customer reviews with authentic product photos increase conversion rates by up to 270%. Currently, `pd_product_review` only supports plain text. This plan enables uploading up to 3 photos per review, verified against delivered customer orders.

---

### 2. Implementation Details
1. Table: `pd_product_review_media (id, review_id, media_url, media_type, status)`.
2. Assertion: Customer must have a delivered order containing the product to submit media.
3. Media is passed through image optimization and thumbnail generator before public display.
4. Product page reviews tab includes interactive lightbox gallery.

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/review-media.test.ts
```
