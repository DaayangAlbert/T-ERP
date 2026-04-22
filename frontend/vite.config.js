import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

function manualChunks(id) {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("react-router")) {
    return "router-vendor";
  }

  if (
    id.includes(`${path.sep}react${path.sep}`) ||
    id.includes(`${path.sep}react-dom${path.sep}`) ||
    id.includes(`${path.sep}scheduler${path.sep}`)
  ) {
    return "react-vendor";
  }

  if (id.includes("react-i18next") || id.includes("i18next")) {
    return "i18n-vendor";
  }

  if (
    id.includes("socket.io-client") ||
    id.includes("engine.io-client") ||
    id.includes("socket.io-parser") ||
    id.includes("axios")
  ) {
    return "network-vendor";
  }

  if (
    id.includes("lucide-react") ||
    id.includes("@radix-ui") ||
    id.includes("class-variance-authority") ||
    id.includes("tailwind-merge") ||
    id.includes("clsx") ||
    id.includes("prop-types")
  ) {
    return "ui-vendor";
  }

  return "vendor";
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.js",
    css: true,
    testTimeout: 20000,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
