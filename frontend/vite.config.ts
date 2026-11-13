import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin in dev, exactly like production on Vercel: the browser
    // only ever calls /api on the frontend's own origin, and Vite forwards
    // it to uvicorn. No cross-origin request for an extension or browser
    // policy to block.
    proxy: { "/api": "http://localhost:8000" },
  },
});
