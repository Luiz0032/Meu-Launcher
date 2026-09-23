import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  build: {
    rollupOptions: {
      input: {
        launcher: resolve(__dirname, "index.html"),
        game: resolve(__dirname, "game.html")
      }
    }
  }
});
