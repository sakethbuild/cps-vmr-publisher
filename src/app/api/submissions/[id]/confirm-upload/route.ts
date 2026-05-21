import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, type AllowedUploadExtension } from "@/lib/constants";
import { verifyImageMagicBytes } from "@/lib/image-validation";
import { convertFirstPdfPageToPng } from "@/lib/pdf-conversion";
import { prisma } from "@/lib/prisma";
import { determineStatusForExistingSubmission } from "@/lib/submission";
import { getStorageService } from "@/lib/storage";

export const runtime = "nodejs";
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
      await storage.deleteFile(body.publicUrl).catch(() => {});
      return NextResponse.json(
        { error: verification.reason },
        { status: 400 },
      );
    }

    // Final stored values default to what the client uploaded.
    let finalStoragePath = body.publicUrl;
    let finalSanitizedFileName = body.sanitizedFileName;
    let finalFileExtension: string = body.fileExtension;
    let finalFileMimeType = body.fileMimeType;

    // PDF auto-conversion: download → render first page → upload PNG → delete PDF.
    if (verification.format === "pdf") {
      try {
        const pdfBytes = await storage.readFile(body.publicUrl);
        const pngBytes = await convertFirstPdfPageToPng(pdfBytes);

        const pngFileName = body.sanitizedFileName.replace(/\.pdf$/i, ".png");
        const folder = body.storageKey.includes("/")
          ? body.storageKey.split("/").slice(0, -1).join("/")
          : `submissions/${id}`;

        const savedPng = await storage.saveFile({
          buffer: pngBytes,
          fileName: pngFileName,
          folder,
          contentType: "image/png",
        });

        // The PDF served its purpose. Best-effort cleanup.
        await storage.deleteFile(body.publicUrl).catch((cleanupError) => {
          console.warn(
            `[confirm-upload] could not delete original PDF after conversion for ${id}:`,
            cleanupError instanceof Error ? cleanupError.message : cleanupError,
          );
        });

        finalStoragePath = savedPng.absolutePath;
        finalSanitizedFileName = pngFileName;
        finalFileExtension = "png";
        finalFileMimeType = "image/png";
      } catch (conversionError) {
        // Conversion failed (corrupt PDF, encrypted, etc.). Surface a clear
        // error and clean up the orphan PDF in R2.
        await storage.deleteFile(body.publicUrl).catch(() => {});
        const reason = conversionError instanceof Error
          ? conversionError.message.replace(/[.\s]+$/, "")
          : "";
        return NextResponse.json(
          {
            error: reason
              ? `Could not convert your PDF to an image: ${reason}. Try exporting your slide as PNG or JPG directly.`
              : "Could not convert your PDF to an image. Try exporting as PNG or JPG.",
          },
          { status: 400 },
        );
      }
    }

    const previousStoragePath = submission.storagePath;
    if (previousStoragePath && previousStoragePath !== finalStoragePath) {
      await storage.deleteFile(previousStoragePath).catch(() => {
        // best-effort cleanup of replaced file
      });
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        storagePath: finalStoragePath,
        originalFileName: body.originalFileName,
        sanitizedFileName: finalSanitizedFileName,
        fileMimeType: finalFileMimeType,
        fileExtension: finalFileExtension,
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
      storagePath: finalStoragePath,
      sanitizedFileName: finalSanitizedFileName,
      fileExtension: finalFileExtension,
      fileMimeType: finalFileMimeType,
      converted: verification.format === "pdf",
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
