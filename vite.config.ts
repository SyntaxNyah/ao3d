import { defineConfig } from "vite";

// AO3(D) deploys statically to GitHub Pages, so use a relative base so the
// site works under any repo subpath (e.g. /ao3d/).
//
// The optimizer exclusions and COOP/COEP headers are inherited from
// noname0310/babylon-mmd-vite-template: babylon-mmd's WASM runtime needs
// cross-origin isolation, and @babylonjs/core / babylon-mmd are pre-bundled
// as-is.
export default defineConfig({
  base: "./",
  optimizeDeps: {
    exclude: ["@babylonjs/core", "babylon-mmd"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
