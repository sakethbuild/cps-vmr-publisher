import type { SubmissionStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmissionEditor } from "@/components/submission-editor";
import { StatusBadge } from "@/components/status-badge";
import { requireUserOrRedirect } from "@/lib/auth";
import { buildSubmissionPublicUrl } from "@/lib/public-pages";
import { prisma } from "@/lib/prisma";
import { toFormState } from "@/lib/submission";

type SubmissionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ flash?: string }>;
};

// Flash messages set by the create-mode "Submit and Publish" flow, which lands
// here after creating + (attempting to) publish. The message explains what's
// next when the VMR was saved but couldn't go live yet.
function flashToFeedback(
  flash: string | undefined,
  status: SubmissionStatus,
): { tone: "success" | "info"; message: string } | null {
  if (flash === "published") {
    return {
      tone: "success",
      message: "Submitted and published — it's now live.",
    };
  }
  if (flash === "needs-more") {
    const detail =
      status === "awaiting_youtube"
        ? "Add a YouTube link, then click Publish to put it live."
        : status === "awaiting_upload"
          ? "Upload the PDF, then click Publish."
          : status === "submitted"
            ? "Fill in the remaining required fields, then click Publish."
            : "Review the details, then click Publish.";
    return { tone: "info", message: `Saved as a draft. ${detail}` };
  }
  return null;
}

export default async function SubmissionDetailPage({
  params,
  searchParams,
}: SubmissionDetailPageProps) {
  const user = await requireUserOrRedirect();
  const { id } = await params;
  const { flash } = await searchParams;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      people: true,
    },
  });

  if (!submission) {
    notFound();
  }

  // R2 paths are stable (derived from submission title + date), so when a
  // Replace PDF overwrites the file at the same URL, the browser would serve
  // the cached old image. Append uploadConfirmedAt as a query string so each
  // replace gets a fresh URL and busts the browser cache.
  const cacheBust = submission.uploadConfirmedAt?.getTime() ?? "";
  const withCacheBust = (path: string | null) =>
    path ? (cacheBust ? `${path}?v=${cacheBust}` : path) : null;
  const pdfUrl = withCacheBust(submission.storagePath);
  const thumbnailUrl = withCacheBust(submission.thumbnailPath);
  const role = user.role;
  const initialFeedback = flashToFeedback(flash, submission.status);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link href="/admin" className="hover:text-text-primary transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-text-secondary truncate max-w-xs">{submission.title}</span>
        <span className="ml-auto">
          <StatusBadge status={submission.status} />
        </span>
      </div>

      <SubmissionEditor
        mode="edit"
        initialState={toFormState(submission)}
        submissionId={submission.id}
        pdfUrl={pdfUrl}
        thumbnailUrl={thumbnailUrl}
        originalFileName={submission.originalFileName}
        publicUrl={submission.slug ? buildSubmissionPublicUrl(submission.slug) : null}
        userRole={role}
        initialFeedback={initialFeedback}
      />
    </div>
  );
}
