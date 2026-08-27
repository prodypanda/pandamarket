# 03 — Buyer Dashboard & Customer Account Deep Audit

## 1. Scope & Features (`frontend/src/app/hub/account/*` & `/store/[storeHost]/account/*`)

PandaMarket provides a unified customer experience across both Central Marketplace accounts and isolated Storefront customer accounts:

```
frontend/src/app/hub/
├── account/                   # Buyer profile, address book, password security, 2FA
├── orders/                    # Order history, timeline status, PDF invoice downloads
├── wishlist/                  # Saved products across marketplace stores
├── cases/                     # Fraud reports & dispute case discussions
├── messages/                  # Real-time chat with merchant sellers
└── my-followed-feed/          # Feed of new products from followed stores
```

---

## 2. Deep Audit of Customer Flows

### 2.1 Order Tracking & Digital Downloads
- **Physical Deliveries:** Live tracking bar displaying carrier status (Picked Up ➔ In Transit ➔ Out for Delivery ➔ Delivered).
- **Digital Downloads:** Temporary, time-limited presigned S3/R2 download URLs generated on-the-fly (`/api/pd/orders/:id/downloads/:fileId`).
- **Serial / License Keys:** Serial keys (`pd_serial_key`) are masked and revealed with one-click copy upon payment capture.

### 2.2 Product Reviews & Media Attachments
- **Verified Purchase Requirement:** Reviews (`pd_review`) can only be submitted by verified buyers who completed an order for the product.
- **Media Uploads:** Reviewers can attach up to 5 photos (`pd_review_media`) processed through the image compression pipeline.

### 2.3 Buyer Dispute Case Threads (`/hub/cases`)
- **Case Management:** If a package is missing or damaged, buyers can open a case against the vendor with description, photos, and desired outcome (Refund / Replacement).
- **Admin Moderation:** Admins can intervene directly in the thread, freeze order funds, or issue an administrative refund.

---

## 3. Buyer Account Checklist

- [x] Address book management with governorate postal code auto-detection.
- [x] Secured digital downloads with expiring presigned URLs.
- [x] Masked license key reveal and copy actions.
- [x] Verified buyer product reviews with photo attachments.
- [ ] Add one-click "Re-Order" action in order history.
