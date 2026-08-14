import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Reads client/.env — see client/.env.example.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const target = env.VITE_API_TARGET || "http://localhost:5000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.VITE_PORT || 5173),
      proxy: {
        "/api": { target, changeOrigin: true },
        "/uploads": { target, changeOrigin: true },
      },
    },
  };
});
