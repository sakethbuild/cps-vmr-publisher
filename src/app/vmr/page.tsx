export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { VmrArchive, type ArchiveSubmission } from "@/components/vmr-archive";
import { prisma } from "@/lib/prisma";
import { getPublicTemplateLabel } from "@/lib/template-display";

export default async function PublicVmrArchivePage() {
  const submissions = await prisma.submission.findMany({
    where: {
      status: "published",
      slug: { not: null },
    },
    orderBy: [{ sessionDate: "desc" }, { updatedAt: "desc" }],
    include: { people: true },
  });

  const archiveItems: ArchiveSubmission[] = submissions.map((submission) => {
    // Precompute a lowercased search blob so the client filter stays a single
    // substring check: title + chief concern + custom title + public type label
    // + every presenter/discussant name.
    const searchText = [
      submission.title,
      submission.chiefComplaint,
      submission.customTitle,
      getPublicTemplateLabel(submission.templateType, submission.customTitle),
      submission.people.map((p) => p.fullName).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      id: submission.id,
      title: submission.title,
      slug: submission.slug,
      sessionDate: submission.sessionDate,
      templateType: submission.templateType,
      chiefComplaint: submission.chiefComplaint,
      customTitle: submission.customTitle,
      youtubeUrl: submission.youtubeUrl,
      thumbnailPath: submission.thumbnailPath,
      searchText,
    };
  });

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Virtual Morning Reports
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Explore recent community-submitted case conferences from The Clinical
            Problem Solvers.
          </p>
        </div>

        {/* Link back to the main CPS site for everything that doesn't live in
            this archive (older VMRs, schemas, illness scripts, guidance). */}
        <div className="flex flex-col gap-2 rounded-[10px] border border-border-default bg-surface-secondary px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            Looking for older VMRs, case presentation guidance, schemas, or illness
            scripts?
          </p>
          <a
            href="https://clinicalproblemsolving.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Visit the main CPS website
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </header>

      {/* useSearchParams (inside VmrArchive) needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <VmrArchive submissions={archiveItems} />
      </Suspense>
    </div>
  );
}
