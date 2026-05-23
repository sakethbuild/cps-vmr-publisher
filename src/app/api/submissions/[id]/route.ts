import { NextResponse } from "next/server";

import { requireInternalAccess, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorageService } from "@/lib/storage";
import {
  buildSubmissionPayload,
  createPeopleData,
  parseSubmissionFormData,
  validateUploadRequirement,
} from "@/lib/submission";

export const runtime = "nodejs";

type SubmissionRouteProps = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: SubmissionRouteProps) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json(
      { error: "Only a super admin can delete submissions." },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const submission = await prisma.submission.findUnique({ where: { id } });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    // Clean up both the canonical PDF and the auto-generated thumbnail from R2.
    // Each delete is best-effort: a single storage hiccup must not block the DB row
    // from going away (the orphan-sweep cron will reap any leftovers).
    const pathsToCleanup = [submission.storagePath, submission.thumbnailPath].filter(
      (path): path is string => Boolean(path),
    );
    if (pathsToCleanup.length > 0) {
      try {
        const storage = getStorageService();
        await Promise.all(
          pathsToCleanup.map(async (path) => {
            try {
              await storage.deleteFile(path);
            } catch (perFileError) {
              console.warn(
                `[delete] failed to delete ${path} for submission ${id}:`,
                perFileError instanceof Error ? perFileError.message : perFileError,
              );
            }
          }),
        );
      } catch (storageError) {
        console.warn(
          `[delete] storage service unavailable for submission ${id}; deleting DB row anyway:`,
          storageError instanceof Error ? storageError.message : storageError,
        );
      }
    }

    await prisma.submission.delete({ where: { id } });

    return NextResponse.json({ message: "Submission deleted." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete submission." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, { params }: SubmissionRouteProps) {
  if (!(await requireInternalAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existingSubmission = await prisma.submission.findUnique({ where: { id } });

    if (!existingSubmission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    if (
      existingSubmission.status === "published" &&
      !(await requireSuperAdmin())
    ) {
      return NextResponse.json(
        {
          error:
            "This submission is published. Only a super admin can edit a live VMR.",
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const input = parseSubmissionFormData(formData);

    validateUploadRequirement({
      templateType: input.templateType,
      hasIncomingUpload: false,
      hasExistingUpload: Boolean(existingSubmission.storagePath),
    });

    const payload = buildSubmissionPayload({
      input,
      upload: null,
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
