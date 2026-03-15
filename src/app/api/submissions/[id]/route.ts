import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
import { calculateSubmissionStatus } from "@/lib/statuses";
import {
  buildSubmissionPayload,
  createPeopleData,
  parseSubmissionFormData,
  storePrimaryUpload,
  validateUploadRequirement,
} from "@/lib/submission";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SubmissionRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: SubmissionRouteProps) {
  await requireInternalAccess();

  try {
    const { id } = await params;
    const existingSubmission = await prisma.submission.findUnique({
      where: { id },
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const input = parseSubmissionFormData(formData);
    const uploadedFile = formData.get("primaryUpload");
    const hasIncomingUpload = uploadedFile instanceof File && uploadedFile.size > 0;

    validateUploadRequirement({
      templateType: input.templateType,
      hasIncomingUpload,
      hasExistingUpload: Boolean(existingSubmission.storagePath),
    });

    const newUpload = hasIncomingUpload
      ? await storePrimaryUpload({
          submissionId: existingSubmission.id,
          templateType: input.templateType,
          sessionDate: input.sessionDate,
          file: uploadedFile,
        })
      : null;

    const payload = buildSubmissionPayload({
      input,
      upload: newUpload,
      existingSubmission,
    });

    const people = createPeopleData(input.presenters, input.discussants);

    await prisma.submission.update({
      where: { id: existingSubmission.id },
      data: {
        ...payload.data,
        status:
          existingSubmission.status === "wordpress_draft_created" ||
          existingSubmission.status === "published"
            ? existingSubmission.status
            : calculateSubmissionStatus({
                templateType: payload.data.templateType,
                sessionDate: payload.data.sessionDate,
                subspecialty: payload.data.subspecialty,
                residencyProgram: payload.data.residencyProgram,
                customTitle: payload.data.customTitle,
                hasUpload: Boolean(payload.data.storagePath),
                youtubeUrl: payload.data.youtubeUrl,
              }),
        people: {
          deleteMany: {},
          create: people,
        },
      },
    });

    return NextResponse.json({
      message: "Submission updated successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Submission could not be updated.",
      },
      { status: 400 },
    );
  }
}
