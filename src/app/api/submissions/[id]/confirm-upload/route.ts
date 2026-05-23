import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
import {
  MAX_UPLOAD_BYTES,
  THUMBNAIL_MIME_TYPE,
  type AllowedUploadExtension,
} from "@/lib/constants";
import { verifyImageMagicBytes } from "@/lib/image-validation";
import { prisma } from "@/lib/prisma";
import { determineStatusForExistingSubmission } from "@/lib/submission";
import { getStorageService } from "@/lib/storage";

export const runtime = "nodejs";

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
  // Client-rendered thumbnail metadata. Browser renders the first PDF
  // page to PNG via pdfjs-dist + canvas (real browser canvas, no native
  // binary), then uploads to R2 via its own presigned URL. Server just
  // records the path.
  thumbnail?: {
    publicUrl: string;
    storageKey: string;
    sanitizedFileName: string;
  } | null;
};

export async function POST(request: Request, { params }: ConfirmRouteProps) {
  await requireInternalAccess();

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

    const storage = getStorageService();

    // Guard 1: enforce the size cap server-side. Client validation can be
    // bypassed; verify the actual bytes in R2.
    const contentLength = await storage.getContentLength(body.publicUrl);
    if (contentLength !== null && contentLength > MAX_UPLOAD_BYTES) {
      await storage.deleteFile(body.publicUrl).catch(() => {});
      if (body.thumbnail?.publicUrl) {
        await storage.deleteFile(body.thumbnail.publicUrl).catch(() => {});
      }
      return NextResponse.json(
        {
          error: `File is ${(contentLength / 1024 / 1024).toFixed(1)} MB — larger than the ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
        },
        { status: 400 },
      );
    }

    // Guard 2: verify the bytes actually start with %PDF, not just trust
    // the client's claim. Stops attempts to upload non-PDFs via spoofed
    // file extensions.
    const headerBytes = await storage.readByteRange(body.publicUrl, 0, 15);
    const verification = verifyImageMagicBytes(headerBytes, body.fileExtension);
    if (!verification.ok) {
      await storage.deleteFile(body.publicUrl).catch(() => {});
      if (body.thumbnail?.publicUrl) {
        await storage.deleteFile(body.thumbnail.publicUrl).catch(() => {});
      }
      return NextResponse.json(
        { error: verification.reason },
        { status: 400 },
      );
    }

    // Replace path: delete previous canonical PDF + previous thumbnail if
    // the new URLs differ (R2 paths can be stable across replaces, in
    // which case the bytes are overwritten and no cleanup is needed).
    const previousStoragePath = submission.storagePath;
    if (previousStoragePath && previousStoragePath !== body.publicUrl) {
      await storage.deleteFile(previousStoragePath).catch(() => {});
    }
    const newThumbnailPath = body.thumbnail?.publicUrl ?? null;
    if (
      submission.thumbnailPath &&
      submission.thumbnailPath !== newThumbnailPath
    ) {
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
        thumbnailPath: newThumbnailPath,
        thumbnailMimeType: newThumbnailPath ? THUMBNAIL_MIME_TYPE : null,
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
      thumbnailPath: newThumbnailPath,
      sanitizedFileName: body.sanitizedFileName,
      fileExtension: body.fileExtension,
      fileMimeType: body.fileMimeType,
      thumbnailGenerated: Boolean(newThumbnailPath),
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
