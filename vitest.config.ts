import { defineConfig } from "vitest/config";

/**
 * The package renders HTML from the document tree, so the tests are plain
 * function calls and vitest needs no framework config — which is itself
 * the thing worth noticing about this file.
 */
export default defineConfig({
  test: { include: ["lib/**/*.test.ts"], exclude: ["node_modules/**"], environment: "node" },
});
