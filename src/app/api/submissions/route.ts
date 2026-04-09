import { randomUUID } from "node:crypto";

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

export async function POST(request: Request) {
  await requireInternalAccess();

  try {
    const formData = await request.formData();
    const input = parseSubmissionFormData(formData);
    const uploadedFile = formData.get("primaryUpload");

    const submissionId = randomUUID();
    const hasIncomingUpload = uploadedFile instanceof File && uploadedFile.size > 0;

    validateUploadRequirement({
      templateType: input.templateType,
      hasIncomingUpload,
      hasExistingUpload: false,
    });

    const upload = hasIncomingUpload
      ? await storePrimaryUpload({
          submissionId,
          templateType: input.templateType,
          sessionDate: input.sessionDate,
          file: uploadedFile,
        })
      : null;

    const payload = buildSubmissionPayload({
      input,
      upload,
    });

    const people = createPeopleData(input.presenters, input.discussants);

    const submission = await prisma.submission.create({
      data: {
        id: submissionId,
        ...payload.data,
        people: {
          create: people,
        },
      },
    });

    return NextResponse.json({
      id: submission.id,
      status: submission.status,
      message: "Submission saved and added to the admin dashboard.",
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
