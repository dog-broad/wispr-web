import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The crypto primitives run against Node's global WebCrypto (Node 20+).
    // No DOM is required for the unit suite. When component tests land,
    // they'll go in their own project with a happy-dom environment.
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
