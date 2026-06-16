export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { VmrArchive, type ArchiveSubmission } from "@/components/vmr-archive";
import { prisma } from "@/lib/prisma";

export default async function PublicVmrArchivePage() {
  const submissions = await prisma.submission.findMany({
    where: {
      status: "published",
      slug: { not: null },
    },
    orderBy: [{ sessionDate: "desc" }, { updatedAt: "desc" }],
  });

  const archiveItems: ArchiveSubmission[] = submissions.map((submission) => ({
    id: submission.id,
    title: submission.title,
    slug: submission.slug,
    sessionDate: submission.sessionDate,
    templateType: submission.templateType,
    chiefComplaint: submission.chiefComplaint,
    youtubeUrl: submission.youtubeUrl,
    thumbnailPath: submission.thumbnailPath,
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Virtual Morning Reports
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Community-submitted case conferences from The Clinical Problem Solvers.
        </p>
      </header>

      {/* useSearchParams (inside VmrArchive) needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <VmrArchive submissions={archiveItems} />
      </Suspense>
    </div>
  );
}
