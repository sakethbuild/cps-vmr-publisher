import { NextResponse } from "next/server";

import { requireInternalAccess, requireSuperAdmin } from "@/lib/auth";
import { determineStatusForExistingSubmission } from "@/lib/submission";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type UpdateYoutubeRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: UpdateYoutubeRouteProps) {
  if (!(await requireInternalAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const submission = await prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    // Editing a published submission's YouTube URL is super-admin only —
    // matches the same rule the front-end disables Save changes with.
    if (submission.status === "published" && !(await requireSuperAdmin())) {
      return NextResponse.json(
        { error: "Only super admins can edit a published VMR." },
        { status: 403 },
      );
    }

    const { youtubeUrl } = (await request.json()) as {
      youtubeUrl?: string;
    };

    const normalizedUrl = youtubeUrl?.trim() || null;

    if (normalizedUrl) {
      new URL(normalizedUrl);
    }

    const status =
      submission.status === "published"
        ? submission.status
        : determineStatusForExistingSubmission(submission, {
            youtubeUrl: normalizedUrl,
          });

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        youtubeUrl: normalizedUrl,
        status,
      },
    });

    return NextResponse.json({
      message: normalizedUrl
        ? "YouTube URL updated and status refreshed."
        : "YouTube URL cleared and status refreshed.",
      status: updated.status,
      youtubeUrl: updated.youtubeUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "YouTube URL could not be updated.",
      },
      { status: 400 },
    );
  }
}
