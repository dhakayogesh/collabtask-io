import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ],

  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: true,
  },

  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});