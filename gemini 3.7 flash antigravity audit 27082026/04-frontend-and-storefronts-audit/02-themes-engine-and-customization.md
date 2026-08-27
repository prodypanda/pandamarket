# 02 — Themes Engine & Visual Customization

## 1. 20 Pre-Built Responsive Storefront Themes

PandaMarket includes **20 pre-built React 19 storefront templates** designed for diverse merchant verticals in Tunisia:

| Theme ID | Design Aesthetic | Best Fit Category | Typography & Radius |
| :--- | :--- | :--- | :--- |
| **Minimal** | Clean whitespace, high-contrast monochrome | Fashion, Architecture, Books | Sans-Serif, Sharp corners |
| **Classic** | Traditional merchant grid, warm accents | General Goods, Food, Grocery | Serif Headings, Soft curves |
| **Modern** | Bold gradients, glassmorphism badges | Electronics, Gadgets, Cosmetics | Inter, Rounded 16px |
| **Boutique** | Pastel accents, editorial photography | Women's Fashion, Jewelry | Playfair, Pill buttons |
| **Artisan** | Earth tones, craft textures, olive green | Pottery, Carpets, Tunisian Crafts | Handcrafted Serif, 8px |
| **TechHub** | High-density specs table, dark accents | Hardware, IT, Gaming | Monospace accents, Sharp 4px |
| **Flavor** | Vibrant orange & red, quick-add cards | Gourmet, Dates, Olive Oil | Bold Display, Rounded 24px |
| **Elegance** | Gold accents on charcoal, minimalist | Luxury watches, Perfumes | High-Fashion Serif |
| **Neon** | Cyberpunk dark mode, fluorescent green/cyan | Gaming gear, Streetwear | JetBrains Mono, Angular |
| **Sahara** | Warm sand tones, desert gold, terracotta | Traditional artisanal, Spices | Warm Serif, Organic curves |
| **Medina** | Geometric arabesque motifs, turquoise | Tunisian heritage, Babouches | Traditional Arabic Calligraphy |
| **Coastal** | Deep Mediterranean blue, crisp white | Beachwear, Nautical, Resort | Clean Sans, Fluid grid |
| **Urban** | High-density streetwear grid, marquee strip | Sneakerheads, Youth apparel | Heavy Impact Display |
| **Garden** | Sage green, botanical floral patterns | Plants, Organic skincare, Herbs | Soft Serif, Organic radius |
| **Studio** | Full-width photography, sticky buy bar | Photography, Art prints, Design | Editorial Sans, Frameless |
| **Luxe** | Champagne gold, velvet black, serif titles | Haute couture, Fine jewelry | Didot Serif, Elegant borders |
| **Fresh** | Lime & mint green, badge overlays | Healthy food, Bio products | Rounded Sans, Bouncy UI |
| **Craft** | Vintage paper background, stitch borders | Handmade gifts, Leather | Vintage Slab, Stitched border |
| **Digital** | License key preview cards, instant download | Software, Courses, E-books | Modern Tech Sans |
| **Kids** | Playful candy colors, cartoon sticker badges | Toys, Baby clothes, School gear | Bubble Sans, Heavy radius |

---

## 2. Dynamic Color & Token Resolvers

Every theme defines fallback palette tokens that can be dynamically overridden by the seller without page reload:
- `resolveThemeColors(theme, themeCustomization)` in `frontend/src/lib/themes.ts` resolves:
  - `--pd-primary`: Seller primary brand color.
  - `--pd-secondary`: Accent and badge color.
  - `--pd-background`: Page canvas background.
  - `--pd-surface`: Product card and drawer surface.
  - `--pd-text`: High-contrast body typography.
  - `--pd-header-bg` & `--pd-footer-bg`: Chrome background overrides.

---

## 3. Theme Audit Checklist

- [x] All 20 themes support dynamic primary and secondary color overrides.
- [x] Full Arabic RTL layout support with bidirectional text mirroring.
- [x] Responsive layout testing across mobile (375px), tablet (768px), and desktop (1440px).
- [x] Fast SSR hydration with zero Flash of Unstyled Content (FOUC).
- [ ] Add seller theme export/import (`.pmtheme` signed JSON packages).
