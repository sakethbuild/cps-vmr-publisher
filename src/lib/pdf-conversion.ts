import "server-only";

import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

const MAX_RENDER_SCALE = 2;

export async function convertFirstPdfPageToPng(buffer: Buffer): Promise<Buffer> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!("DOMMatrix" in g)) g.DOMMatrix = DOMMatrix;
  if (!("ImageData" in g)) g.ImageData = ImageData;
  if (!("Path2D" in g)) g.Path2D = Path2D;

  // pdfjs-serverless is a pdfjs build that pre-bundles the worker and runs
  // entirely in the main thread — no workerSrc gymnastics, works cleanly on
  // Vercel's bundled serverless functions.
  const { getDocument } = await import("pdfjs-serverless");

  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
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
