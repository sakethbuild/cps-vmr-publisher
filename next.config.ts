import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "@libsql/client"],
  // Force Vercel's deploy file-tracer to include the @napi-rs/canvas Linux
  // binary. Without this, the trace only ships the macOS binary that's on
  // the developer's laptop, and PDF thumbnail generation silently fails on
  // prod with "@napi-rs/canvas is not available in this environment".
  outputFileTracingIncludes: {
    "/api/submissions/[id]/confirm-upload": [
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
      "./node_modules/@napi-rs/canvas/**",
    ],
  },
};

export default nextConfig;
