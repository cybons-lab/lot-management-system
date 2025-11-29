import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// Docker Compose environment: backend service name is "backend"
// Development environment: can override with VITE_BACKEND_ORIGIN
const target = process.env.VITE_BACKEND_ORIGIN || "http://backend:8000";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      host: "localhost", // ホスト側からHMRする
      port: 5173,
    },
    watch: {
      usePolling: true, // Docker環境でのファイル監視安定化
    },
    proxy: {
      "/api": {
        target,
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("[vite] proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("[vite] proxy request:", req.method, req.url, "->", target);
          });
        },
      },
    },
  },
});
