import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.ts", "**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      include: ["**/src/**/*.ts"],
      exclude: [
        "**/src/**/*.d.ts",
        "**/src/index.ts",
        "**/node_modules/**",
        "**/dist/**",
      ],
      reporter: ["text", "lcov", "html"],
    },
    testTimeout: 30000,
    globals: true,
  },
  resolve: {
    alias: {
      "@mcp/utils": new URL("./packages/utils/src/index.ts", import.meta.url)
        .pathname,
      "@mcp/schemas": new URL(
        "./packages/schemas/src/index.ts",
        import.meta.url
      ).pathname,
    },
  },
});
