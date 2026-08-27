# 05 — Internationalization (I18n), RTL & SEO Metadata

## 1. Trilingual Localization Parity (FR / AR / EN)

PandaMarket is designed for Tunisia's trilingual commerce environment:
- **Languages Supported:**
  - **French (`fr.json`):** Primary business and e-commerce language.
  - **Arabic (`ar.json`):** Official language with full Right-to-Left (RTL) layout mirroring.
  - **English (`en.json`):** International buyer and merchant interface.
- **Dynamic Directionality:** Switching to Arabic automatically applies `dir="rtl"` on `<html>`, mirrors navigation drawers, swaps chevron icons, and adjusts padding/margin alignments (`mr-*` ↔ `ml-*`).
- **Translation Parity Test:** `frontend/src/__tests__/i18n-parity.test.ts` enforces 100% key synchronization across all 3 language bundles.

---

## 2. Dynamic SEO & JSON-LD Structured Data

Every storefront and marketplace page dynamically generates SEO meta tags:

1. **Dynamic Metadata (`generateMetadata`):**
   - Unique title: `[Product Title] | [Store Name] - PandaMarket Tunisia`
   - Canonical URLs pointing to the primary verified custom domain or subdomain.
   - OpenGraph & Twitter Card images generated from the primary product image.
2. **JSON-LD Schema Markup:**
   - `schema.org/Product` with name, description, image, price in TND, currency, and availability (`InStock` / `OutOfStock`).
   - `schema.org/Store` with physical address, phone, and opening hours.
   - `schema.org/BreadcrumbList` for hierarchical category navigation.
3. **Dynamic XML Sitemaps & Robots:**
   - Next.js dynamic `sitemap.ts` and `robots.ts` indexing all active, published products and categories while blocking admin and auth routes.

---

## 3. Localization & SEO Checklist

- [x] 100% translation key parity across French, Arabic, and English.
- [x] Full RTL layout support with mirrored flexbox and grid layouts.
- [x] Dynamic OpenGraph and Twitter card generation.
- [x] JSON-LD product and organization schema injection.
- [ ] Add Tunisian Derja dialect phonetic search synonym dictionary.
