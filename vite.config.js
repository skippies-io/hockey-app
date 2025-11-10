// /vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({ jsxRuntime: "automatic" })], // ✅ Enable automatic JSX transform
  base: "/hockey-app/",
  server: {
    host: true,
    allowedHosts: [
      /^[a-z0-9-]+\.ngrok-free\.app$/,
      /^[a-z0-9-]+\.trycloudflare\.com$/,
    ],
    hmr: {
      protocol: "wss",
      clientPort: 443,
    },
  },
  preview: {
    host: true,
    allowedHosts: [
      /^[a-z0-9-]+\.ngrok-free\.app$/,
      /^[a-z0-9-]+\.trycloudflare\.com$/,
    ],
  },
});
