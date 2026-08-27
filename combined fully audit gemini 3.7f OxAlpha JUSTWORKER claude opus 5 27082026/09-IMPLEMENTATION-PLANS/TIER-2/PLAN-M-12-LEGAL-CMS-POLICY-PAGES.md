# Engineering Specification: PLAN-M-12
## Legal & Compliance Policy CMS (Terms, Privacy & PDP Law 2004-63)

- **Target PRD Gap:** [M-12](../../04-MISSING-WORK-PRD/M-07-TO-M-18-PLATFORM-FEATURES.md#m-12)
- **Severity:** 🟡 PRD Gap / Legal Compliance
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Platform CMS, Hub Footer, Cookie Banner, Legal Pages.

---

### 1. Summary & Business Impact
Marketplace and storefront footers currently link to stub legal pages or 404s. Under Tunisian Personal Data Protection Law 2004-63 and eCommerce consumer law, platforms must maintain accessible Terms of Service, Privacy Policies, Seller Contracts, and Return Policies with explicit versioning and consent logging.

---

### 2. Implementation Details
1. Seed default bilingual (French/Arabic) legal policies in `pd_cms_page`:
   - `/terms`: Conditions Générales d'Utilisation (CGU)
   - `/privacy`: Politique de Confidentialité & Protection des Données
   - `/returns`: Politique de Remboursement & Droit de Rétractation
   - `/seller-agreement`: Contrat Vendeur Marketplace
2. Implement version tracking in `pd_legal_terms_acceptance`.
3. Prompt existing users on login if terms version has incremented.

---

### 3. Verification Plan
```bash
npm run test -w frontend -- src/__tests__/legal-pages.test.tsx
```
