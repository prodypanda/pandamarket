# 04 — Ads Autopilot, Creative Studio & Boost Deep Links

## 1. 1-Click "Boost Product" Workflow

To eliminate merchant onboarding friction, every product listing in the Seller Dashboard includes a **Sponsor / Boost** action:

```mermaid
graph LR
    ProductRow[Seller Product Row /hub/dashboard/products] -->|Click 'Boost'| DeepLink[/hub/dashboard/ads/new?product_id=...]
    DeepLink --> PreFill[Campaign Wizard Pre-Fills Title, Image, Category & Destination]
    PreFill --> Budget[Seller Picks Daily Budget: 5 TND, 10 TND, 25 TND]
    Budget --> Submit[1-Click Launch]
```

- **Persistence:** In-progress wizard state is saved in `localStorage` so merchants can navigate away and resume without losing creative uploads.

---

## 2. Multi-Format Creative Studio & AI Banner Generator

The Creative Studio allows merchants to generate responsive ad variations:
1. **Sponsored Product:** Uses high-resolution product thumbnails with automated "Sponsored" badge overlay.
2. **Sponsored Brand:** Showcases the merchant's logo, brand tagline, and a 3-product showcase rail.
3. **Sponsored Content:** Custom image, markdown promotional description, and call-to-action button ("Shop Now", "Profitez de l'offre").

### AI Banner Generation Blueprint (Gemini Multimodal):
Merchants can click **"Generate AI Ad Creatives"** to produce 3 banner aspect ratios:
- `16:9` Hero Banner ($1200 \times 675\text{ px}$)
- `1:1` Square In-Feed Card ($800 \times 800\text{ px}$)
- `9:16` Story / Mobile Banner ($1080 \times 1920\text{ px}$)

---

## 3. Ads Creative Checklist

- [x] Sponsor / Boost deep-linking from product tables to the campaign wizard.
- [x] Multi-step campaign wizard with draft recovery.
- [x] Real-time banner live card preview.
- [x] Accessible "Sponsorisé" badge overlays on all ad placements.
- [ ] Add Gemini multimodal 1-click banner generator.
