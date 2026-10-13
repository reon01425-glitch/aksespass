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
    files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    ignores: [
      "src/lib/privacy/logger.ts",
      "src/**/*.test.{ts,js,tsx,jsx}",
      "src/**/__tests__/**",
    ],
    rules: {
      "no-console": "error",
    },
  },
]);

export default eslintConfig;
