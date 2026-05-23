"use client";

/**
 * Render the first page of a PDF to a PNG Blob, entirely in the browser.
 *
 * Why client-side: serverless runtimes (Vercel Lambda, Cloudflare Workers)
 * can't reliably ship the native canvas binaries that PDF rendering needs.
 * pdfjs-serverless avoids this by intentionally mocking @napi-rs/canvas —
 * fine for text extraction, broken for rendering. The browser already has
 * a real canvas + a JS-native pdfjs build, so rendering here costs us
 * nothing and avoids every native-binary footgun.
 *
 * The worker file is served from /pdfjs/pdf.worker.min.mjs (a copy of
 * node_modules/pdfjs-dist/build/pdf.worker.min.mjs placed in public/).
 */

const RENDER_SCALE = 2;
let workerConfigured = false;

async function ensurePdfjs() {
  // Dynamic import keeps pdfjs-dist out of the server bundle entirely.
  const pdfjsLib = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    workerConfigured = true;
  }
  return pdfjsLib;
}

export async function renderPdfFirstPageToPngBlob(file: File): Promise<Blob> {
  const pdfjsLib = await ensurePdfjs();
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  }).promise;

  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get 2D canvas context for thumbnail rendering");
    }

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas could not be converted to PNG"));
        },
        "image/png",
        0.92,
      );
    });
  } finally {
    // Free the rendered page resources. pdfjs holds these aggressively
    // otherwise.
    await pdf.cleanup().catch(() => {});
    await pdf.destroy().catch(() => {});
  }
}
