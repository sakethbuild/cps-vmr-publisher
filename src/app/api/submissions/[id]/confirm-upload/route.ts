import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, type AllowedImageExtension } from "@/lib/constants";
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
  fileExtension: AllowedImageExtension;
  fileMimeType: string;
  originalFileName: string;
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

    const headerBytes = await storage.readByteRange(body.publicUrl, 0, 15);
    const verification = verifyImageMagicBytes(headerBytes, body.fileExtension);

    if (!verification.ok) {
      await storage.deleteFile(body.publicUrl).catch(() => {
        // best-effort cleanup
      });
      return NextResponse.json(
        { error: verification.reason },
        { status: 400 },
      );
    }

    const previousStoragePath = submission.storagePath;
    if (previousStoragePath && previousStoragePath !== body.publicUrl) {
      await storage.deleteFile(previousStoragePath).catch(() => {
        // best-effort cleanup of replaced file
      });
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        storagePath: body.publicUrl,
        originalFileName: body.originalFileName,
        sanitizedFileName: body.sanitizedFileName,
        fileMimeType: body.fileMimeType,
        fileExtension: body.fileExtension,
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
