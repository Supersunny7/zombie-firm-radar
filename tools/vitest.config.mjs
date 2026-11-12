import { defineConfig } from "vitest/config";

// Image generation and sharp work are slow on cold Windows runs; the 5 s default is too tight.
export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
