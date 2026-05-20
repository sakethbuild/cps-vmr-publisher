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
  const { submissionId } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || !submission.storagePath) {
    return NextResponse.json({ error: "File not available." }, { status: 404 });
  }

  if (submission.storagePath.startsWith("http://") || submission.storagePath.startsWith("https://")) {
    return NextResponse.redirect(submission.storagePath);
  }

  const storage = getStorageService();
  const fileBuffer = await storage.readFile(submission.storagePath);
  const filename = submission.sanitizedFileName ?? "download.png";

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": submission.fileMimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
