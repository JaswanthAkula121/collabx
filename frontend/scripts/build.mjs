import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));

await build({
  configFile: false,
  root: frontendRoot,
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
