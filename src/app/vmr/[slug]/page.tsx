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
    where: {
      slug,
      status: "published",
    },
    include: {
      people: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  const uploadUrl = submission.storagePath
    ? `/uploads/${submission.id}/original`
    : null;
  const previewImageUrl = submission.previewImagePath
    ? `/uploads/${submission.id}/preview`
    : null;
  const presenters = buildLinkedPeople(
    submission.people
      .filter((person) => person.role === "presenter")
      .map((person) => ({
        fullName: person.fullName,
        linkType: person.linkType,
        handleOrUrl: person.handleOrUrl,
        normalizedUrl: person.normalizedUrl,
      })),
  );
  const discussants = buildLinkedPeople(
    submission.people
      .filter((person) => person.role === "discussant")
      .map((person) => ({
        fullName: person.fullName,
        linkType: person.linkType,
        handleOrUrl: person.handleOrUrl,
        normalizedUrl: person.normalizedUrl,
      })),
  );

  return (
    <div className="space-y-5">
      <Link
        href="/vmr"
        className="inline-flex text-sm font-medium text-gray-500 transition hover:text-gray-900"
      >
        ← All VMRs
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
