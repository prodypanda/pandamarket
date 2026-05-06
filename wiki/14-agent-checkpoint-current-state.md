# 14 — Agent Checkpoint & Current State

> **Last updated:** 2026-05-06  
> **Primary handoff file:** [`../docs/AGENT_CHECKPOINT_2026-05-06.md`](../docs/AGENT_CHECKPOINT_2026-05-06.md)

This page exists so a new agent browsing the wiki can immediately find the current project state and the latest completed work.

## Current focus

The latest completed work focused on storefront theming and storefront cart/checkout correctness:

- Storefront theme templates use shared cart helpers instead of hardcoded cart links/counts.
- Route-level storefront pages now apply seller-selected theme colors/fonts/chrome.
- Storefront checkout removes only the current store's cart items after success.
- Page Builder storefront pages use shared store cart chrome.

## Start here for the full handoff

Read the dedicated checkpoint:

- [`docs/AGENT_CHECKPOINT_2026-05-06.md`](../docs/AGENT_CHECKPOINT_2026-05-06.md)

It includes:

- Project overview and routing model.
- The user's current goals.
- Files changed in the storefront theming/cart pass.
- Validation commands and results.
- Rules for the next agent.
- Suggested next checks.

## High-level next-agent rules

- Inspect current `git diff` before editing.
- Keep Hub marketplace routes and storefront subdomain routes separate.
- Use shared helpers for theme colors, product links, and cart icons.
- Preserve store-scoped cart behavior.
- Validate with targeted TypeScript, ESLint, and tests after changes.
