import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src"), // Unit tests always run against the demo salon, whatever salon.config.ts exports.
      "@config": path.resolve(__dirname, "src/config/demo.config.ts") },
  },
});
