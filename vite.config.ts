import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function githubPagesSpaFallback() {
  let outputDirectory = resolve(__dirname, "dist");

  return {
    name: "github-pages-spa-fallback",
    configResolved(config: { build: { outDir: string }; root: string }) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyFileSync(resolve(outputDirectory, "index.html"), resolve(outputDirectory, "404.html"));
    },
  };
}

export default defineConfig({
  plugins: [react(), githubPagesSpaFallback()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        "service-worker": resolve(__dirname, "src/service-worker.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "service-worker" ? "service-worker.js" : "assets/[name]-[hash].js",
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "supabase-vendor": ["@supabase/supabase-js"],
        },
      },
    },
  },
});
