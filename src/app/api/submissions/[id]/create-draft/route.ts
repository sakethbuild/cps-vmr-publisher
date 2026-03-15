import { NextResponse } from "next/server";

import { requireInternalAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWordPressPublisher } from "@/lib/wordpress";

export const runtime = "nodejs";

type CreateDraftRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: CreateDraftRouteProps) {
  await requireInternalAccess();

  try {
    const { id } = await params;
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        people: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    if (
      !["ready_for_draft", "wordpress_draft_created", "published"].includes(
        submission.status,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This submission is not ready for draft creation yet. Update the status first.",
        },
        { status: 400 },
      );
    }

    const publisher = getWordPressPublisher();
    const result = await publisher.createDraft(submission);

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: "wordpress_draft_created",
        wordpressPageId: result.pageId,
        wordpressUrl: result.url,
        wordpressPrimaryMediaUrl: result.primaryMediaUrl ?? null,
        wordpressPreviewMediaUrl: result.previewMediaUrl ?? null,
      },
    });

    return NextResponse.json({
      message: `WordPress draft created in ${result.mode} mode.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "WordPress draft could not be created.",
      },
      { status: 400 },
    );
  }
}
