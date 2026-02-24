import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [tailwindcss(), tanstackRouter({}), react()],
  base: command === "build" ? "./" : "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
  },
  server: {
    port: 3001,
    strictPort: true,
  },
}));
