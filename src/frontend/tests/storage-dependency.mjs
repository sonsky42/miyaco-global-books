// Use the browser bundler: this package is not intended for native Node ESM.
import { build } from "vite";
import { fileURLToPath } from "node:url";

await build({
  configFile: false,
  root: fileURLToPath(new URL("../", import.meta.url)),
  build: {
    write: false,
    minify: false,
    rollupOptions: {
      input: fileURLToPath(new URL("./storage-import.js", import.meta.url)),
    },
  },
});
console.log("PASS: Caffeine generated-binding storage import bundles successfully");
