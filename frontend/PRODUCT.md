# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are authenticated marketplace buyers in Tunisia who follow independent stores and want one efficient place to review new products, price changes, and relevant cross-store discoveries. Sellers and marketplace administrators are secondary stakeholders because follows, product publishing, and recommendation settings shape this buyer experience.

## Product Purpose

PandaMarket combines a central marketplace discovery hub with independent multi-tenant seller storefronts. The followed feed helps buyers keep up with stores they intentionally follow while still discovering relevant products and similar stores across the marketplace.

## Positioning

The feed joins three signals that normally live apart: explicit store follows, chronological product updates, and interest-tag recommendations across independent Tunisian sellers.

## Operating Context

Buyers use the feed from the marketplace hub on desktop and mobile. They scan followed stores, filter a timeline by store or update type, open products, add products to cart, follow recommended stores, refresh the feed, and recover from loading or authentication errors.

## Capabilities and Constraints

- Preserve the three functional areas: followed stores, followed-store product timeline, and personalized discoveries.
- Preserve loading, unauthenticated, error, retry, refresh, store filtering, timeline filtering, add-to-cart, and follow-store behavior.
- The application uses Next.js App Router, React, Tailwind CSS, Lucide icons, dark mode, and French buyer-facing copy on this route.
- The interface must remain responsive, keyboard accessible, and compatible with the existing Hub navigation and marketplace themes.
- Product and store media may be absent, so every visual treatment needs a credible non-image fallback.
- Inferred from repository evidence: this feed is a repeated-use marketplace workspace, not a marketing landing page.

## Brand Commitments

The product name is PandaMarket. The established marketplace identity uses a restrained green accent for the core theme and warmer red/orange accents for alternate marketplace themes. The experience is Tunisia-first and should feel commercially credible rather than novelty-driven.

## Evidence on Hand

- Functional implementation: `src/components/feed/`
- Route: `src/app/hub/my-followed-feed/page.tsx`
- Product architecture and business context: `../README.md`, `../wiki/01-project-overview.md`, and `../ai instructions/`
- Automated interaction coverage: `src/__tests__/my-followed-feed.test.tsx`
- Real product and store data are provided by the buyer subscription and recommendation APIs; no testimonials or marketing claims should be invented.

## Product Principles

- Make intentional follows feel primary and algorithmic discovery feel clearly secondary.
- Optimize for fast scanning, comparison, and repeated action.
- Show useful states honestly when images, discounts, follows, or recommendations are absent.
- Keep cross-store discovery transparent and avoid making personalization feel opaque.
- Preserve buyer trust through stable layout, clear prices, and predictable controls.

## Accessibility & Inclusion

Support keyboard navigation, visible focus, readable contrast in light and dark themes, reduced-motion preferences, and layouts that remain usable on narrow mobile screens.
