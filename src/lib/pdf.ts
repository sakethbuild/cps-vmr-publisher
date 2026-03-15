import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

export async function convertFirstPdfPageToPng(buffer: Buffer): Promise<Buffer> {
  if (!("DOMMatrix" in globalThis)) {
    globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix;
  }

  if (!("ImageData" in globalThis)) {
    globalThis.ImageData = ImageData as unknown as typeof globalThis.ImageData;
  }

  if (!("Path2D" in globalThis)) {
    globalThis.Path2D = Path2D as unknown as typeof globalThis.Path2D;
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
  });

  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
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
