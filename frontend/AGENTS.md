<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PandaMarket agent handoff

Before changing code, read `../docs/AGENT_CHECKPOINT_2026-05-06.md`.

Key rules:

- Keep Hub marketplace routes and storefront subdomain routes separate.
- Use shared theme helpers and shared cart components for storefront work.
- Preserve store-scoped cart behavior.
- Inspect current diffs before editing.
- Run targeted TypeScript, ESLint, and tests after changes.
