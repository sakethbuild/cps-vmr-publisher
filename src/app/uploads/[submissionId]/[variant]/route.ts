import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStorageService } from "@/lib/storage";

export const runtime = "nodejs";

type UploadRouteProps = {
  params: Promise<{
    submissionId: string;
    variant: string;
  }>;
};

export async function GET(_: Request, { params }: UploadRouteProps) {
  const { submissionId, variant } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const relativePath =
    variant === "preview" ? submission.previewImagePath : submission.storagePath;
  const mimeType =
    variant === "preview"
      ? submission.previewImageMimeType
      : submission.fileMimeType;
  const filename =
    variant === "preview"
      ? (submission.sanitizedFileName ?? "preview.png").replace(/\.[^.]+$/, ".png")
      : submission.sanitizedFileName ?? "download";

  if (!relativePath) {
    return NextResponse.json({ error: "File not available." }, { status: 404 });
  }

  const storage = getStorageService();
  const fileBuffer = await storage.readFile(relativePath);

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
