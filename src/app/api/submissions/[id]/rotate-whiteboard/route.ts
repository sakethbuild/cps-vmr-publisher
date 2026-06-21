import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/auth";
import { THUMBNAIL_MIME_TYPE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { renderFirstPagePngFromBuffer } from "@/lib/server-pdf-render";
import { getStorageService } from "@/lib/storage";

export const runtime = "nodejs";
// Re-reading the PDF from R2 + re-rasterizing page 1 dominates; same budget as
// confirm-upload.
export const maxDuration = 60;

type RotateRouteProps = {
  params: Promise<{ id: string }>;
};

// Rotate the generated whiteboard thumbnail by another 90° clockwise. Used to
// upright PDFs that were exported sideways (a source-file issue we can't detect
// automatically). Re-renders from the canonical PDF at the new absolute angle
// and overwrites the thumbnail; the PDF itself is left untouched.
export async function POST(_: Request, { params }: RotateRouteProps) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json(
      { error: "Only a super admin can rotate the whiteboard." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (!submission.storagePath) {
    return NextResponse.json(
      { error: "There's no PDF whiteboard to rotate yet." },
      { status: 400 },
    );
  }

  const nextRotation = ((submission.thumbnailRotation ?? 0) + 90) % 360;

  try {
    const storage = getStorageService();
    const pdfBytes = await storage.readFile(submission.storagePath);
    const pngBytes = await renderFirstPagePngFromBuffer(pdfBytes, nextRotation);

    const thumbnailFileName = (submission.sanitizedFileName ?? `${id}.pdf`).replace(
      /\.pdf$/i,
      ".thumb.png",
    );
    const saved = await storage.saveFile({
      buffer: pngBytes,
      fileName: thumbnailFileName,
      folder: `submissions/${id}`,
      contentType: THUMBNAIL_MIME_TYPE,
    });

    // Clean up the old thumbnail if it lived at a different key (normally it's
    // the same key, so this is a no-op overwrite).
    if (submission.thumbnailPath && submission.thumbnailPath !== saved.absolutePath) {
      await storage.deleteFile(submission.thumbnailPath).catch(() => {});
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        thumbnailPath: saved.absolutePath,
        thumbnailMimeType: THUMBNAIL_MIME_TYPE,
        thumbnailRotation: nextRotation,
        // Bump the cache-bust stamp so the card + inline whiteboard fetch the
        // freshly-rotated image instead of a cached copy.
        uploadConfirmedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      rotation: updated.thumbnailRotation,
      message: "Whiteboard rotated 90°.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not rotate the whiteboard: ${error.message}`
            : "Could not rotate the whiteboard.",
      },
      { status: 500 },
    );
  }
}
