import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
      // "server-only" throws if imported in a client context. In vitest's
      // node-environment tests it isn't relevant, so stub it to an empty
      // module so modules that import it (e.g. src/lib/submission.ts) can
      // be unit-tested.
      "server-only": path.resolve(dirname, "src/lib/__tests__/__stubs__/server-only.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
