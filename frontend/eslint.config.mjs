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

      // ── Audit P2-23 tiered gate (updated 2026-08-25) ─────────────────────
      // Correctness rules stay at "error" and BLOCK the CI gate.
      // react/no-unescaped-entities was re-escalated to error after a
      // codemod cleared all 77 findings (2026-08-25).
      //
      // Remaining tracked debt (counts at last sweep):
      //   no-explicit-any ~350 · no-unused-vars ~300 (multi-line imports &
      //   locals — single-line imports cleared) · no-img-element 101 ·
      //   static-components 23 · purity 12 · exhaustive-deps 33 ·
      //   preserve-manual-memoization 1
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@next/next/no-img-element": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
