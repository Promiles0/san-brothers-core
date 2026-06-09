import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      port: 3000,
      strictPort: true,
      hmr: true,
      watch: {
        usePolling: false,
      },
    },
    optimizeDeps: {
      force: false,
    },
    build: {
      outDir: "dist",
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
    resolve: {
      alias: {
        "#tanstack-router-entry": "@tanstack/react-start/server-entry",
      },
    },
  },
});
