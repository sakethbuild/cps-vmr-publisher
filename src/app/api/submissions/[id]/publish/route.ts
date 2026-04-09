import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
import {
  buildSubmissionPublicUrl,
  resolveUniqueSubmissionSlug,
} from "@/lib/public-pages";
import { prisma } from "@/lib/prisma";
import { determineStatusForExistingSubmission } from "@/lib/submission";

export const runtime = "nodejs";

type PublishRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: PublishRouteProps) {
  await requireInternalAccess();

  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const nextStatus =
    submission.status === "published"
      ? "published"
      : determineStatusForExistingSubmission(submission);

  if (!["ready_to_publish", "published"].includes(nextStatus)) {
    return NextResponse.json(
      {
        error:
          nextStatus === "awaiting_youtube"
            ? "This submission still needs a YouTube URL before it can go live."
            : "This submission still needs its required fields before it can go live.",
      },
      { status: 400 },
    );
  }

  const slug =
    submission.slug ??
    (await resolveUniqueSubmissionSlug(submission.title, async (candidate) => {
      const existing = await prisma.submission.findFirst({
        where: {
          slug: candidate,
          NOT: { id: submission.id },
        },
        select: { id: true },
      });

      return Boolean(existing);
    }));

  const publishedAt = submission.publishedAt ?? new Date();

  const updated = await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: "published",
      slug,
      publishedAt,
    },
  });

  return NextResponse.json({
    status: updated.status,
    slug: updated.slug,
    publicUrl: updated.slug ? buildSubmissionPublicUrl(updated.slug) : null,
    message: "Submission published and now has a live public page.",
  });
}
