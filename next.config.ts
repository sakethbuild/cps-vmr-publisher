import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client uses native bindings (better-sqlite3 etc.) — keep it
  // out of Next's bundle so the runtime resolves the right binary.
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
