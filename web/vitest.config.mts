import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next.js provides "server-only" at build time; in tests it's a no-op.
      "server-only": fileURLToPath(new URL("./src/lib/empty-module.js", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node", testTimeout: 20_000 },
});
