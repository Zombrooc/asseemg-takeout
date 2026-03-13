import { defineConfig } from "vitest/config";
import path from "node:path";
import react from "@vitejs/plugin-react";

const appReact = path.resolve(__dirname, "./node_modules/react");
const appReactDom = path.resolve(__dirname, "./node_modules/react-dom");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: /^react$/, replacement: appReact },
      { find: /^react\/(.+)$/, replacement: `${appReact}/$1` },
      { find: /^react-dom$/, replacement: appReactDom },
      { find: /^react-dom\/(.+)$/, replacement: `${appReactDom}/$1` },
    ],
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        inline: ["react", "react-dom", "@base-ui/react", "@testing-library/react", "@tanstack/react-query"],
      },
    },
  },
});
