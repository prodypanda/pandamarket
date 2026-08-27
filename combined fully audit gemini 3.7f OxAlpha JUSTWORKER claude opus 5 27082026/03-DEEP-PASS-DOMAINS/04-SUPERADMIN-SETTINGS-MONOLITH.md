# 11 — Superadmin Settings Deep Pass

> **Audited Surfaces:** `frontend/src/app/(admin)/settings/page.tsx` (**6,245 lines / 336 KB**), `frontend/src/types/settings.ts`, `backend/src/api/admin/settings.routes.ts` (776 lines), `backend/src/services/platform-config.service.ts` (1,127 lines), table `pd_platform_config`.

---

## 1. Scale & Complexity Inventory

The settings system manages **238 configuration keys** across 11 tabs:
- **Backend Defaults:** 257 keys defined in `platform-config.service.ts`.
- **Zod Schema:** 238 keys in `globalSettingsSchema`.
- **Frontend State Monolith:** All 11 tabs are mounted simultaneously in the DOM and toggled via CSS `hidden` (**32 occurrences**). Every single keystroke in an input field causes React to re-render 6,245 lines of JSX.

---

## 2. Structural Duplication & Drift

### 2.1 Default-Value Drift & Phantom Contact Details
Significant drift exists between default values in `page.tsx`, `types/settings.ts`, and the backend defaults:

| Setting Key | `page.tsx` | `types/settings.ts` | Backend Default | Real World Impact |
|---|---|---|---|---|
| `marketplace_address` | `'123 Avenue Habib Bourguiba, Tunis'` | `''` | `''` | Admin sees fabricated address on partial loads. |
| `marketplace_support_phone` | `'+216 71 000 000'` | `''` | `''` | Phantom placeholder phone number. |
| `marketplace_support_whatsapp` | `'+216 50 000 000'` | `''` | `''` | Phantom WhatsApp number. |
| `marketplace_country` | `'TN'` | `'Tunisia'` | `'Tunisia'` | Country format mismatch. |

---

### 2.2 The 15 Double-Owned Keys & Self-Inflicted 409 Save Conflicts
15 keys are registered in both `marketplace` and `algorithm` sections:
- `hub_card_show_rating`, `hub_card_show_add_to_cart`, `hub_card_add_to_cart_style`, `hub_card_show_store_name`, `hub_card_show_store_verified`, `hub_card_show_store_score`, `hub_grid_columns`, `hub_grid_items_per_load`, `hub_search_grid_columns`, `hub_search_items_per_page`, `hub_search_sponsored_enabled`, `hub_search_sponsored_columns`, `hub_search_sponsored_count`, `catalog_featured_category_slugs`, `catalog_default_sort`.

**The Bug:** Optimistic locking uses `If-Match: sectionVersion`. Saving the Algorithm tab updates the `updated_at` timestamp on `pd_platform_config`. When the administrator subsequently clicks Save on the Marketplace tab, the backend detects a version mismatch and **returns HTTP 409 Conflict**, preventing the admin from saving changes!

---

### 2.3 Duplicated Controls for the Same Key
- `marketplace_theme`: Rendered as a visual card picker at line 3226 AND as a dropdown at line 3373 in the same tab.
- `hub_homepage_layout`: Rendered as a 6-card layout picker at line 3753 AND as a `<select>` dropdown at line 3793 with disagreeing option labels.

---

## 3. Missing Settings & Zombie Controls

### 3.1 The 4 Missing Bank Keys Buyers Need for Mandat Payments
The database and backend define:
- `mandat_bank_name`
- `mandat_bank_rib`
- `mandat_bank_iban`
- `mandat_recipient_phone`

**Critical Finding:** The Superadmin Settings page has a "Mandat Minute Recipient" section that allows editing name, CIN, city, and email, but **completely omits the bank name, RIB, and IBAN!** As a result, buyers selecting Mandat payments cannot see real bank transfer coordinates unless direct SQL queries are run on the database.

---

### 3.2 13 UI Controls That Cannot Persist
All 12 `image_size_*` controls and `image_quality_webp` are rendered in the UI (lines 5712–5748), but are omitted from `SETTINGS_TAB_KEYS.operations` and `operationsSettingsSchema`. Edits made to these inputs never mark the form dirty, and if forced, the backend rejects them with 400 Bad Request.

---

### 3.3 15 Zombie Controls (Toggles with No Code Consumer)
The following controls exist in the UI and save to the database, but **zero backend or frontend features branch on them**:
1. `cart_enabled`
2. `vendor_registration_enabled`
3. `buyer_registration_enabled`
4. `product_moderation_required`
5. `product_auto_publish_verified`
6. `seller_type_change_auto_approval`
7. `price_rounding_mode`
8. `auto_cancel_unpaid_enabled`
9. `auto_cancel_unpaid_minutes`
10. `payout_schedule`
11. `max_products_per_store_free`
12. `default_low_stock_threshold`
13. `max_product_images`
14. `hub_feed_ab_testing_enabled`
15. `marketplace_support_whatsapp`

---

## 4. Search & UX Breakdown

- **Search Index Coverage:** The search bar relies on a hardcoded 92-entry list covering only **39% of the 238 settings**.
- **Broken Jump Anchors:** **33 of the 92 search entries** point to DOM element IDs (`id="setting-<key>"`) that do not exist in the page. Clicking them produces no scroll action.
- **Absence of URL State:** The active tab is not synced to URL query parameters (`?tab=finance`), making it impossible to bookmark or share links to specific settings tabs.

---

## 5. Architectural Redesign: The 7 Decoupled Settings Modules

To eliminate client lag, merge conflicts, and double-ownership bugs, decompose `(admin)/settings/page.tsx` into 7 independent tab files:

```
components/admin/settings/tabs/
├── 1-GeneralSettingsTab.tsx       (Identity, legal links, support contacts)
├── 2-AppearanceSettingsTab.tsx    (Theme selection, hero carousel, banners)
├── 3-CatalogCommerceTab.tsx       (Product rules, taxes, order splitting)
├── 4-FinancePaymentsTab.tsx       (Gateways, retention, Mandat bank coordinates)
├── 5-ShippingDeliveryTab.tsx      (Governorate rates, carrier credentials)
├── 6-SecurityOperationsTab.tsx    (Maintenance, rate-limits, session policies)
└── 7-IntegrationsWebmasterTab.tsx (Evolution API, analytics pixels, custom code)
```

Each tab must own its own isolated Zod sub-schema, optimistic lock version, and independent save button.
