import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    lifecycle: "./src/lifecycle.ts",
    product: "./src/product.ts",
    scheduled: "./src/scheduled.ts",
    webtrigger: "./src/webtrigger.ts",
  },
  format: ["esm", "cjs"],
  sourcemap: true,
  target: "node22",
});
