import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { determineStatusForExistingSubmission } from "@/lib/submission";

export const runtime = "nodejs";

type MarkReadyRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: MarkReadyRouteProps) {
  await requireInternalAccess();

  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const nextStatus =
    submission.templateType === "custom"
      ? "ready_for_draft"
      : determineStatusForExistingSubmission(submission, {
          manualStatus: "ready_for_draft",
        });

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: nextStatus,
    },
  });

  return NextResponse.json({
    message:
      nextStatus === "ready_for_draft"
        ? "Submission marked ready for draft."
        : "Submission still needs a YouTube URL before it can become ready.",
  });
}
