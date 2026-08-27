# Engineering Specification: PLAN-M-17
## Automated PDF Invoice & Delivery Slip Generator (Facture & Bon de Livraison)

- **Target PRD Gap:** [M-17](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-17)
- **Severity:** 🟡 PRD Gap / Legal Accounting & Logistics Compliance
- **Estimated Effort:** 🛠 3.5 hours
- **Impacted Systems:** Order Service, PDF Generator Worker, Seller Orders Page.

---

### 1. Summary & Business Impact
Tunisian commercial law requires sellers and shipping carriers to carry a physical delivery slip ("Bon de Livraison") and provide a compliant sales invoice ("Facture de Vente") including Matricule Fiscal, Timbre Fiscal (1.000 TND), and TVA breakdown. Currently, sellers must manually write invoices.

---

### 2. Implementation Details
1. Install PDFKit: `npm install pdfkit @types/pdfkit -w backend`.
2. Generator service: `backend/src/services/pdf-invoice.service.ts`.
3. Template features:
   - Vendor & Buyer Matricule Fiscal, CIN, and full addresses.
   - Line items with quantity, unit price, TVA rate (7%, 13%, 19%).
   - Timbre fiscal (1.000 TND) on invoiced cash orders.
   - QR code encoding order verification URL.
4. Endpoints:
   - `GET /api/pd/seller/orders/:id/invoice.pdf`
   - `GET /api/pd/seller/orders/:id/packing-slip.pdf`

---

### 3. Verification Plan
```bash
npm run test -w backend -- src/__tests__/pdf-invoice.test.ts
```
