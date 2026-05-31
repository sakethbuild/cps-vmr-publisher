import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client uses native bindings; mupdf ships a WASM module that must
  // load from its own dist (bundling it through Turbopack breaks the WASM
  // loader the same way it broke the pdfjs worker). Keep both external.
  serverExternalPackages: ["@libsql/client", "mupdf"],
  // Force the deploy file-tracer to ship mupdf's WASM into the confirm-upload
  // function. Dynamic WASM loads are invisible to the tracer otherwise, which
  // would 500 the render with "mupdf-wasm.wasm not found" on Vercel.
  outputFileTracingIncludes: {
    "/api/submissions/[id]/confirm-upload": ["./node_modules/mupdf/dist/**"],
  },
};

export default nextConfig;
