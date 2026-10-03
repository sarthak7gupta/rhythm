import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

loadDotenv({ path: ".env.local" });

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart(),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
});
