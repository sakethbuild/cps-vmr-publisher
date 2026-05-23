import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
import {
  buildSubmissionPayload,
  createPeopleData,
  parseSubmissionFormData,
  validateUploadRequirement,
} from "@/lib/submission";
import { prisma } from "@/lib/prisma";
import { createPresignedUploadForSubmission } from "@/lib/upload-orchestration";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await requireInternalAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const input = parseSubmissionFormData(formData);

    const uploadFileName = (formData.get("uploadFileName") as string | null)?.trim() || null;
    const uploadMimeType = (formData.get("uploadMimeType") as string | null)?.trim() || null;
    const hasIncomingUpload = Boolean(uploadFileName);

    validateUploadRequirement({
      templateType: input.templateType,
      hasIncomingUpload,
      hasExistingUpload: false,
    });

    const submissionId = randomUUID();

    let presignedUpload: Awaited<
      ReturnType<typeof createPresignedUploadForSubmission>
    > | null = null;
    if (hasIncomingUpload && uploadFileName) {
      presignedUpload = await createPresignedUploadForSubmission({
        submissionId,
        templateType: input.templateType,
        sessionDate: input.sessionDate,
        originalFileName: uploadFileName,
        declaredMimeType: uploadMimeType,
      });
    }

    const payload = buildSubmissionPayload({
      input,
      upload: null,
    });

    const people = createPeopleData(input.presenters, input.discussants);

    const submission = await prisma.submission.create({
      data: {
        id: submissionId,
        ...payload.data,
        people: { create: people },
      },
    });

    return NextResponse.json({
      id: submission.id,
      status: submission.status,
      presignedUpload: presignedUpload
        ? {
            uploadUrl: presignedUpload.uploadUrl,
            publicUrl: presignedUpload.publicUrl,
            storageKey: presignedUpload.storageKey,
            sanitizedFileName: presignedUpload.sanitizedFileName,
            fileExtension: presignedUpload.fileExtension,
            fileMimeType: presignedUpload.fileMimeType,
            expiresInSeconds: presignedUpload.expiresInSeconds,
            originalFileName: uploadFileName,
          }
        : null,
      message: presignedUpload
        ? "Submission created. Uploading file..."
        : "Submission saved and added to the admin dashboard.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Submission could not be saved.",
      },
      { status: 400 },
    );
  }
}
