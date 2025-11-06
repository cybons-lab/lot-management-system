import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
        target: "http://lot-backend:8000",
        changeOrigin: true,
      },
    },
  },
});
