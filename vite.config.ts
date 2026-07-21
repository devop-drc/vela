import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Strip debug noise from production bundles; console.warn/error are kept.
  esbuild: {
    drop: ["debugger"],
    pure: ["console.log", "console.debug", "console.info"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-dom") || id.match(/[\\/]react[\\/]/) || id.includes("scheduler"))
            return "react-vendor";
          if (id.includes("react-router")) return "router";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("i18next") || id.includes("react-i18next")) return "i18n";
          if (id.includes("date-fns")) return "date-fns";
          if (id.includes("react-day-picker")) return "day-picker";
          if (id.includes("@dnd-kit")) return "dnd-kit";
          if (id.includes("react-hook-form") || id.includes("@hookform")) return "forms";
          if (id.includes("embla-carousel") || id.includes("vaul") || id.includes("cmdk"))
            return "ui-extras";
          // Everything else: leave to default chunker (per-route shared chunks).
          return;
        },
      },
    },
  },
}));
