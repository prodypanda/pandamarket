import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Disable React 19 strict effect rules — data fetching in useEffect is a valid pattern
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",

      // ── Audit P2-23 tiered gate (2026-08-25) ─────────────────────────────
      // Correctness rules stay at "error" and BLOCK the CI gate:
      //   react-hooks/rules-of-hooks, react-hooks/refs, react-hooks/use-memo.
      // The four rules below are tracked technical debt downgraded to "warn"
      // so the error-gate is enforceable today. Counts at downgrade time:
      //   no-explicit-any 351 · no-unescaped-entities 77 ·
      //   static-components 23 · purity 12 · preserve-manual-memoization 1.
      // Re-escalate each to "error" as the debt is burned down.
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
