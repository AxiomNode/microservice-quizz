import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `npm run build` also emits tests into dist/; never run those compiled copies a second time.
    exclude: [...configDefaults.exclude, "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html", "lcov"],
      include: ["app/**/*.ts"],
      exclude: ["app/server.ts", "tests/**", "dist/**", "**/*.d.ts"],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});
