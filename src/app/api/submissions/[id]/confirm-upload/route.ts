import { NextResponse } from "next/server";

import { requireInternalAccess, requireSuperAdmin } from "@/lib/auth";
import {
  MAX_UPLOAD_BYTES,
  THUMBNAIL_MIME_TYPE,
  type AllowedUploadExtension,
} from "@/lib/constants";
import { verifyImageMagicBytes } from "@/lib/image-validation";
import { prisma } from "@/lib/prisma";
import { renderFirstPagePngFromBuffer } from "@/lib/server-pdf-render";
import { determineStatusForExistingSubmission } from "@/lib/submission";
import { getStorageService } from "@/lib/storage";

export const runtime = "nodejs";
// Reading the PDF back from R2 + rasterizing page 1 is the slowest thing here.
// mupdf single-page render is sub-second; the R2 read dominates, bounded by the
// 5 MB upload cap, so well within Hobby's 10s wall.
export const maxDuration = 60;

type ConfirmRouteProps = {
  params: Promise<{ id: string }>;
};

type ConfirmBody = {
  publicUrl: string;
  storageKey: string;
  sanitizedFileName: string;
  fileExtension: AllowedUploadExtension;
  fileMimeType: string;
  originalFileName: string;
};

export async function POST(request: Request, { params }: ConfirmRouteProps) {
  if (!(await requireInternalAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as ConfirmBody;
    if (!body?.publicUrl || !body?.storageKey || !body?.fileExtension) {
      return NextResponse.json(
        { error: "Missing upload metadata." },
        { status: 400 },
      );
    }

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    // Replace on a published submission is super-admin only. Mirrors the
    // presign-upload gate so a member can't sneak the confirm step through.
    if (submission.status === "published" && !(await requireSuperAdmin())) {
      return NextResponse.json(
        { error: "Only super admins can replace a published VMR's PDF." },
        { status: 403 },
      );
    }

    const storage = getStorageService();

    // Guard 1: enforce the size cap server-side. Client validation can be
    // bypassed; verify the actual bytes in R2.
    const contentLength = await storage.getContentLength(body.publicUrl);
    if (contentLength !== null && contentLength > MAX_UPLOAD_BYTES) {
      await storage.deleteFile(body.publicUrl).catch(() => {});
      return NextResponse.json(
        {
          error: `File is ${(contentLength / 1024 / 1024).toFixed(1)} MB — larger than the ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
        },
        { status: 400 },
      );
    }

    // Guard 2: verify the bytes actually start with %PDF, not just trust the
    // client's claim. Stops non-PDFs uploaded via spoofed file extensions.
    const headerBytes = await storage.readByteRange(body.publicUrl, 0, 15);
    const verification = verifyImageMagicBytes(headerBytes, body.fileExtension);
    if (!verification.ok) {
      await storage.deleteFile(body.publicUrl).catch(() => {});
      return NextResponse.json(
        { error: verification.reason },
        { status: 400 },
      );
    }

    // Generate the preview thumbnail SERVER-SIDE from the PDF now in R2.
    // Replaces the old client-side pdfjs render, which failed for most real
    // uploads (Turbopack-bundled pdfjs + raw worker → "Worker was destroyed").
    // mupdf is pure WASM, deterministic, browser-independent.
    //
    // Best-effort: a render failure (corrupt/encrypted/exotic PDF) must NOT
    // block the upload — the PDF stays downloadable, the card falls back to a
    // placeholder.
    let thumbnailPath: string | null = null;
    try {
      const pdfBytes = await storage.readFile(body.publicUrl);
      const pngBytes = await renderFirstPagePngFromBuffer(pdfBytes);
      const thumbnailFileName = body.sanitizedFileName.replace(
        /\.pdf$/i,
        ".thumb.png",
      );
      const folder = body.storageKey.includes("/")
        ? body.storageKey.split("/").slice(0, -1).join("/")
        : `submissions/${id}`;
      const saved = await storage.saveFile({
        buffer: pngBytes,
        fileName: thumbnailFileName,
        folder,
        contentType: THUMBNAIL_MIME_TYPE,
      });
      thumbnailPath = saved.publicUrl;
    } catch (thumbnailError) {
      console.warn(
        `[confirm-upload] server thumbnail render failed for ${id}; proceeding without preview:`,
        thumbnailError instanceof Error
          ? thumbnailError.message
          : thumbnailError,
      );
    }

    // Replace path: delete the previous canonical PDF + previous thumbnail if
    // their URLs differ from the new ones.
    const previousStoragePath = submission.storagePath;
    if (previousStoragePath && previousStoragePath !== body.publicUrl) {
      await storage.deleteFile(previousStoragePath).catch(() => {});
    }
    if (submission.thumbnailPath && submission.thumbnailPath !== thumbnailPath) {
      await storage.deleteFile(submission.thumbnailPath).catch(() => {});
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        storagePath: body.publicUrl,
        originalFileName: body.originalFileName,
        sanitizedFileName: body.sanitizedFileName,
        fileMimeType: body.fileMimeType,
        fileExtension: body.fileExtension,
        thumbnailPath,
        thumbnailMimeType: thumbnailPath ? THUMBNAIL_MIME_TYPE : null,
        uploadConfirmedAt: new Date(),
      },
    });

    const nextStatus = determineStatusForExistingSubmission(updated);
    const finalStatus =
      updated.status === "published" ? updated.status : nextStatus;

    if (finalStatus !== updated.status) {
      await prisma.submission.update({
        where: { id },
        data: { status: finalStatus },
      });
    }

    return NextResponse.json({
      ok: true,
      storagePath: body.publicUrl,
      thumbnailPath,
      sanitizedFileName: body.sanitizedFileName,
      fileExtension: body.fileExtension,
      fileMimeType: body.fileMimeType,
      thumbnailGenerated: thumbnailPath !== null,
      status: finalStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not confirm upload.",
      },
      { status: 500 },
    );
  }
}
