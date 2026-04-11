export const dynamic = "force-dynamic";

import { VmrCard } from "@/components/vmr-card";
import { prisma } from "@/lib/prisma";

export default async function PublicVmrArchivePage() {
  const submissions = await prisma.submission.findMany({
    where: {
      status: "published",
      slug: { not: null },
    },
    orderBy: [{ sessionDate: "desc" }, { updatedAt: "desc" }],
  });

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

      {submissions.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((submission) => (
            <VmrCard key={submission.id} submission={submission} />
          ))}
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-border-default bg-surface-secondary py-16 text-center">
          <p className="text-sm text-text-muted">
            No VMRs have been published yet.
          </p>
        </div>
      )}
    </div>
  );
}
