// Separate dev-only configuration: never used by Caffeine's production build.
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";

export default defineConfig(({ command }) => {
  if (command !== "serve") throw new Error("Local test config is for dev serving only");
  let ids;
  try {
    ids = JSON.parse(readFileSync(new URL("../../.dfx/local/canister_ids.json", import.meta.url), "utf8"));
  } catch {
    throw new Error("Local backend is not deployed. Run bash scripts/local-start.sh in WSL first.");
  }
  const backend = ids.backend?.local;
  const identity = ids.internet_identity?.local;
  if (!backend || !identity) throw new Error("Missing local backend or Internet Identity; refusing live fallback");
  process.env.CANISTER_ID_BACKEND = backend;
  process.env.DFX_NETWORK = "local";
  process.env.II_URL = `http://${identity}.localhost:4943`;
  // Do not send test uploads to Caffeine's live object storage service.
  process.env.STORAGE_GATEWAY_URL = "http://localhost:1/local-storage-disabled";
  return {
    plugins: [
      environment(["CANISTER_ID_BACKEND", "DFX_NETWORK", "II_URL", "STORAGE_GATEWAY_URL"]),
      react(),
      {
        name: "local-only-connection",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.split("?")[0] !== "/env.json") return next();
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store");
            res.end(JSON.stringify({
              backend_host: "http://localhost:4943",
              backend_canister_id: backend,
              project_id: "local-test-only",
              ii_derivation_origin: "undefined",
            }));
          });
        },
      },
    ],
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
    css: { postcss: "./postcss.config.js" },
    optimizeDeps: { esbuildOptions: { define: { global: "globalThis" } } },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      dedupe: ["@dfinity/agent"],
    },
  };
});
