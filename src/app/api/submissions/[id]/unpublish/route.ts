import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { determineStatusForExistingSubmission } from "@/lib/submission";

export const runtime = "nodejs";

type UnpublishRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: UnpublishRouteProps) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json(
      { error: "Only a super admin can unpublish submissions." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const nextStatus = determineStatusForExistingSubmission(submission);

  const updated = await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: nextStatus,
      publishedAt: null,
    },
  });

  return NextResponse.json({
    status: updated.status,
    message:
      nextStatus === "ready_to_publish"
        ? "Submission removed from the public site and moved back to ready to publish."
        : "Submission removed from the public site and moved back into review.",
  });
}
