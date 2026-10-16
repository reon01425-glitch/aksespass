import path from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Tes Playwright (e2e/*.spec.ts) dijalankan terpisah lewat `pnpm test:e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
    fileParallelism: false,
  },
});
