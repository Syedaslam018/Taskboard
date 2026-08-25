import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      // The API server runs on :5000 (see server/.env.example, env.ts, nginx).
      "/api": "http://localhost:5001",
      // Socket.io needs its own entry with ws:true so the WebSocket upgrade is
      // proxied too - without this, real-time updates and presence silently
      // fail under `vite dev` (in prod, nginx handles this).
      "/socket.io": {
        target: "http://localhost:5001",
        ws: true,
      },
    },
  },
});
