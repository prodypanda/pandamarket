# 05 - Master Implementation & Remediation Checklist (TODO)

This checklist organizes all recommended remediations into clear, verifiable tasks.

---

## 📋 Phase 1: Database & Backend Core

- [ ] **DB-01**: Create migration `085_fulfillment_processing_status.sql` allowing `'processing'` in `pd_fulfillment.status`.
- [ ] **API-01**: Implement `orderService.markStoreFulfillmentProcessing` in `backend/src/services/order.service.ts`.
- [ ] **API-02**: Add route `POST /api/pd/orders/:id/prepare` in `backend/src/api/order.route.ts` with `requireStore` middleware.
- [ ] **API-03**: Update `order.subscriber.ts` to include `f.shipping_total` in vendor wallet credits for self-managed deliveries.
- [ ] **API-04**: Add unit tests in `backend/src/__tests__/seller-orders.test.ts` verifying the new `prepare` endpoint and status transitions.
- [ ] **API-05**: Run backend test suite: `npm test -w backend`.

---

## 📋 Phase 2: Frontend Dashboard Fixes (`dashboard/orders/page.tsx`)

- [ ] **FE-01**: Remove duplicate `interface OrderItem` declaration at line 140 of `frontend/src/app/hub/dashboard/orders/page.tsx`.
- [ ] **FE-02**: In **COD Radar Tab** (line 2972), change `onClick={() => setSelectedOrder(order)}` to `onClick={() => void openOrderDetail(order)}`.
- [ ] **FE-03**: In **RTO Returns Tab** (line 3205), change `onClick={() => setSelectedOrder(order)}` to `onClick={() => void openOrderDetail(order)}`.
- [ ] **FE-04**: Implement `getStoreOrderStatus(order)` helper to render contextual store-scoped order status badges instead of global master status.
- [ ] **FE-05**: Add `loadingOrderDetail` skeleton placeholder in the drawer items section to prevent premature error message flashing.
- [ ] **FE-06**: Add "Commencer la préparation" action button in order row actions and drawer header calling `POST /api/pd/orders/:id/prepare`.
- [ ] **FE-07**: Update `buildOrderTimeline` logic so that the "Préparation" step only marks `done` when status is actively `processing`, `shipped`, or `delivered`.
- [ ] **FE-08**: Ensure invoice and delivery slip printing (`printSelectedOrder`) gracefully waits for detailed items to load before opening print window.

---

## 📋 Phase 3: Quality Assurance & Forensic Verification

- [ ] **QA-01**: Test Single-Vendor Online Order (Flouci/Konnect):
  - Place order $\rightarrow$ Check wallet credit $\rightarrow$ Transition `pending` $\rightarrow$ `processing` $\rightarrow$ `shipped` $\rightarrow$ `delivered`.
- [ ] **QA-02**: Test Multi-Vendor Order (Store A + Store B):
  - Store A fulfills $\rightarrow$ Store A shows `Expédiée` $\rightarrow$ Master order remains `pending` $\rightarrow$ Store B fulfills $\rightarrow$ Master order updates to `fulfilled`.
- [ ] **QA-03**: Test COD Order Flow:
  - Verify risk score in COD Radar $\rightarrow$ Click order row $\rightarrow$ Verify item list renders completely without "Détail des articles indisponible".
- [ ] **QA-04**: Test RTO Flow:
  - Mark order as RTO $\rightarrow$ Open RTO tab $\rightarrow$ Click "Voir Fiche" $\rightarrow$ Verify item list renders properly with product title, quantity, and price.
- [ ] **QA-05**: Test Invoice & Delivery Slip Printing:
  - Click "Facture" and "Bon de livraison" from drawer $\rightarrow$ Verify item tables contain full line item details.

---

## 📋 Phase 4: Git & Production Deployment Protocol

- [ ] **GIT-01**: Review local diff with `git status` and `git diff`.
- [ ] **GIT-02**: Request user approval to commit and push changes to remote repository `https://github.com/prodypanda/pandamarket` (`github/main`).
- [ ] **DEPLOY-01**: Trigger / verify backend deploy on Render service `srv-d9qjrth42hec73efhoa0` using `RENDER_API_KEY`.
- [ ] **DEPLOY-02**: Verify frontend automatic deployment on Vercel (`www.garbage.team`).
- [ ] **DEPLOY-03**: Smoke test live health endpoint: `https://pandamarket-backend-fjom.onrender.com/health`.
