import "server-only";

import { createRequire } from "node:module";

import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

const MAX_RENDER_SCALE = 2;

// Resolve the pdfjs worker path eagerly so Vercel's tracer keeps it in the
// function bundle (outputFileTracingIncludes also pins it explicitly).
const require = createRequire(import.meta.url);
let cachedWorkerSrc: string | null = null;
function getWorkerSrc(): string | null {
  if (cachedWorkerSrc !== null) return cachedWorkerSrc;
  try {
    cachedWorkerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  } catch {
    cachedWorkerSrc = "";
  }
  return cachedWorkerSrc || null;
}

export async function convertFirstPdfPageToPng(buffer: Buffer): Promise<Buffer> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!("DOMMatrix" in g)) g.DOMMatrix = DOMMatrix;
  if (!("ImageData" in g)) g.ImageData = ImageData;
  if (!("Path2D" in g)) g.Path2D = Path2D;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const workerSrc = getWorkerSrc();
  if (workerSrc) {
    // Setting workerSrc to a known path makes pdfjs load it via Node's
    // import() rather than its default "fake worker" fallback that breaks
    // on Vercel because the worker file isn't traced into the bundle.
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerSrc;
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useWorkerFetch: false,
  });

  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: MAX_RENDER_SCALE });
  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  );
  const context = canvas.getContext("2d");

  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as never,
    viewport,
  }).promise;

  return Buffer.from(await canvas.encode("png"));
}
