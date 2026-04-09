import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
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

export async function DELETE(_request: Request, { params }: SubmissionRouteProps) {
  const authorized = await requireInternalAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const submission = await prisma.submission.findUnique({ where: { id } });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    // Cascade delete handles SubmissionPerson records
    await prisma.submission.delete({ where: { id } });

    return NextResponse.json({
      message: "Submission deleted.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete submission." },
      { status: 400 },
    );
  }
}

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
          existingSubmission.status === "published"
            ? existingSubmission.status
            : payload.status,
        people: {
          deleteMany: {},
          create: people,
        },
      },
    });

    return NextResponse.json({
      status:
        existingSubmission.status === "published" ? "published" : payload.status,
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
