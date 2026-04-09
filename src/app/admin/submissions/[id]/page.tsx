import { notFound } from "next/navigation";

import { SubmissionEditor } from "@/components/submission-editor";
import { StatusBadge } from "@/components/status-badge";
import { formatDisplayDate } from "@/lib/dates";
import { buildSubmissionPublicUrl } from "@/lib/public-pages";
import { prisma } from "@/lib/prisma";
import { toFormState } from "@/lib/submission";

type SubmissionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SubmissionDetailPage({
  params,
}: SubmissionDetailPageProps) {
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      people: true,
    },
  });

  if (!submission) {
    notFound();
  }

  const uploadUrl = `/uploads/${submission.id}/original`;
  const previewImageUrl = submission.previewImagePath
    ? `/uploads/${submission.id}/preview`
    : null;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Submission detail
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {submission.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Session date: {formatDisplayDate(submission.sessionDate)}. Use this
              screen to edit the submission, review the live preview, and publish
              or unpublish its public page.
            </p>
          </div>

          <StatusBadge status={submission.status} />
        </div>
      </section>

      <SubmissionEditor
        mode="edit"
        initialState={toFormState(submission)}
        submissionId={submission.id}
        uploadUrl={uploadUrl}
        previewImageUrl={previewImageUrl}
        publicUrl={submission.slug ? buildSubmissionPublicUrl(submission.slug) : null}
      />
    </div>
  );
}
