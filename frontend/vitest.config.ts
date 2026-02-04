import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

const config =
  typeof viteConfig === "function" ? viteConfig({ mode: "test", command: "serve" }) : viteConfig;

export default mergeConfig(
  config,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/e2e/**",
        "**/.{idea,git,cache,output,temp}/**",
      ],
    },
  }),
);
