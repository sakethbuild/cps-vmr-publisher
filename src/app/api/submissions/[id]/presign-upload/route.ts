import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPresignedUploadForSubmission } from "@/lib/upload-orchestration";

export const runtime = "nodejs";

type PresignRouteProps = {
  params: Promise<{ id: string }>;
};

type PresignBody = {
  originalFileName: string;
  declaredMimeType: string | null;
};

export async function POST(request: Request, { params }: PresignRouteProps) {
  await requireInternalAccess();

  try {
    const { id } = await params;
    const body = (await request.json()) as PresignBody;

    if (!body?.originalFileName) {
      return NextResponse.json(
        { error: "Missing file name." },
        { status: 400 },
      );
    }

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const presigned = await createPresignedUploadForSubmission({
      submissionId: id,
      templateType: submission.templateType,
      sessionDate: submission.sessionDate.toISOString().slice(0, 10),
      originalFileName: body.originalFileName,
      declaredMimeType: body.declaredMimeType,
    });

    return NextResponse.json({
      uploadUrl: presigned.uploadUrl,
      publicUrl: presigned.publicUrl,
      storageKey: presigned.storageKey,
      sanitizedFileName: presigned.sanitizedFileName,
      fileExtension: presigned.fileExtension,
      fileMimeType: presigned.fileMimeType,
      expiresInSeconds: presigned.expiresInSeconds,
      originalFileName: body.originalFileName,
      // Sibling thumbnail presign — client renders first page to PNG and
      // uploads in parallel with the PDF. Server does not render.
      thumbnailUpload: presigned.thumbnailUpload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate upload URL.",
      },
      { status: 400 },
    );
  }
}
