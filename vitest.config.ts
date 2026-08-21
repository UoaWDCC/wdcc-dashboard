import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/allocation/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
});
