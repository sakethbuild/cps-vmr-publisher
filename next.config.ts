import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "@libsql/client"],
  outputFileTracingIncludes: {
    // pdfjs-dist loads pdf.worker.mjs at runtime via dynamic import; Vercel's
    // tracer doesn't pick that up unless we explicitly include it.
    "/api/submissions/*/confirm-upload": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
