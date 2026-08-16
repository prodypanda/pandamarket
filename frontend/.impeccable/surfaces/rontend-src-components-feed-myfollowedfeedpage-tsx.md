---
version: 1
slug: "rontend-src-components-feed-myfollowedfeedpage-tsx"
primary_target: "frontend/src/components/feed/MyFollowedFeedPage.tsx"
related_targets: ["frontend/src/components/feed/FollowedStoresCarousel.tsx","frontend/src/components/feed/FeedTimeline.tsx","frontend/src/components/feed/DiscoverSimilarStores.tsx"]
---

## Scope And Mode

Route `/hub/my-followed-feed`, visitor mode `Operate`.

## Audience And Job

Authenticated marketplace buyers repeatedly scan stores they follow, identify useful new products or price changes, and act without losing context.

## Primary Actions

Filter the timeline, select or clear a followed store, add a product to cart, follow a recommended store, refresh data, and recover from loading, empty, authentication, or server-error states.

## Content And Constraints

Preserve the three existing sections, French buyer-facing copy, all data-testid contracts, dark mode, responsive behavior, and the existing Hub shell. Missing images and missing discounts are normal data states.

## Chosen Direction

Tunisian market bulletin and seller ledger. Paper-white and ink-black fields organize repeated-use content; market green, vermilion, and cobalt identify follows, price activity, and new arrivals. Store selectors behave like vendor stamps, timeline rows like a ruled arrivals ledger, and discovery like a compact buyer's index. The memorable moment is the horizontal stamp rail flowing into a precise chronological ledger.

## Unresolved Decisions

No new factual copy, imagery source, or product behavior is introduced. Product detail navigation remains outside this change because the current component contract does not expose product slugs.
