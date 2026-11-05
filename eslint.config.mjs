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
    "dist/**",
    "mobile/**",
    "archive/**",
    "production/**",
    "legacy-demo/**",
  ]),
  {
    // API payloads are validated server-side with zod; the client works with
    // untyped JSON snapshots. Keep these visible as warnings, not build blockers.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      // Countdown UIs intentionally read the clock while rendering.
      "react-hooks/purity": "warn",
      // React Compiler advisory: the booking form keeps its own manual memoisation.
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
