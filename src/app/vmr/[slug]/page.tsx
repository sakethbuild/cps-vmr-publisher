import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmissionPublicView } from "@/components/submission-public-view";
import { buildLinkedPeople } from "@/lib/preview";
import { formatDisplayDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

type PublicSubmissionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PublicSubmissionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const submission = await prisma.submission.findFirst({
    where: { slug, status: "published" },
    select: { title: true, chiefComplaint: true },
  });

  if (!submission) return {};

  return {
    title: `${submission.title} — The Clinical Problem Solvers`,
    description: submission.chiefComplaint?.trim()
      ? `Chief Concern: ${submission.chiefComplaint.trim()}`
      : "Virtual Morning Report — The Clinical Problem Solvers",
  };
}

export default async function PublicSubmissionPage({
  params,
}: PublicSubmissionPageProps) {
  const { slug } = await params;
  const submission = await prisma.submission.findFirst({
    where: { slug, status: "published" },
    include: {
      people: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!submission) notFound();

  const uploadUrl = submission.storagePath
    ? `/uploads/${submission.id}/original`
    : null;
  const previewImageUrl = submission.previewImagePath
    ? `/uploads/${submission.id}/preview`
    : null;
  const presenters = buildLinkedPeople(
    submission.people
      .filter((p) => p.role === "presenter")
      .map((p) => ({
        fullName: p.fullName,
        linkType: p.linkType,
        handleOrUrl: p.handleOrUrl,
        normalizedUrl: p.normalizedUrl,
      })),
  );
  const discussants = buildLinkedPeople(
    submission.people
      .filter((p) => p.role === "discussant")
      .map((p) => ({
        fullName: p.fullName,
        linkType: p.linkType,
        handleOrUrl: p.handleOrUrl,
        normalizedUrl: p.normalizedUrl,
      })),
  );

  return (
    <div className="space-y-5">
      <Link
        href="/vmr"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to archive
      </Link>

      <SubmissionPublicView
        templateType={submission.templateType}
        title={submission.title}
        sessionDateLabel={formatDisplayDate(submission.sessionDate)}
        chiefComplaint={submission.chiefComplaint}
        presenters={presenters}
        discussants={discussants}
        fileUrl={uploadUrl}
        previewImageUrl={previewImageUrl}
        notes={submission.notes}
        youtubeUrl={submission.youtubeUrl}
      />
    </div>
  );
}
