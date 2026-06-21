import "server-only";

/**
 * Render the first page of a PDF to a PNG Buffer, server-side, via mupdf (WASM).
 *
 * Why mupdf and not pdfjs/canvas:
 *   - mupdf ships a pure-WASM build with ZERO native binaries, so it runs on
 *     Vercel's Node serverless runtime — unlike @napi-rs/canvas, whose
 *     "not available in this environment" error broke the earlier attempt.
 *   - It also avoids the client-side pdfjs path, which silently failed for the
 *     majority of real uploads: a Turbopack-bundled pdfjs main thread paired
 *     with a raw npm worker throws "Worker was destroyed", the best-effort
 *     catch swallows it, and the upload finishes with no thumbnail.
 *   - mupdf rasterizes a single page directly to a pixmap → PNG. Sub-second
 *     for a typical slide, deterministic, browser-independent.
 *
 * Imported dynamically so the WASM only loads inside the serverless function
 * that needs it (confirm-upload), not in every route bundle.
 */

const RENDER_SCALE = 2;

export async function renderFirstPagePngFromBuffer(
  pdfBytes: Buffer,
  // Extra clockwise rotation (degrees) applied on top of the page's own
  // orientation. Used by the manual "rotate whiteboard" control to upright a
  // PDF that was exported sideways. mupdf sizes the pixmap to the rotated
  // bounds, so the output is correctly dimensioned (W/H swap at 90/270).
  rotation = 0,
): Promise<Buffer> {
  const mupdf = await import("mupdf");

  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  try {
    if (doc.countPages() < 1) {
      throw new Error("PDF has no pages");
    }
    const page = doc.loadPage(0);
    const scale = mupdf.Matrix.scale(RENDER_SCALE, RENDER_SCALE);
    const matrix =
      rotation % 360 === 0
        ? scale
        : mupdf.Matrix.concat(scale, mupdf.Matrix.rotate(rotation));
    // alpha=false → opaque white background, which is what we want for a
    // slide-deck preview thumbnail.
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
    return Buffer.from(pixmap.asPNG());
  } finally {
    // mupdf holds WASM-heap resources; free them so a warm Lambda doesn't leak.
    doc.destroy();
  }
}
