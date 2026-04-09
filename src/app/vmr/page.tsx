import Link from "next/link";

import { formatDisplayDate } from "@/lib/dates";
import { buildSubmissionPublicPath } from "@/lib/public-pages";
import { prisma } from "@/lib/prisma";

export default async function PublicVmrArchivePage() {
  const submissions = await prisma.submission.findMany({
    where: {
      status: "published",
      slug: {
        not: null,
      },
    },
    orderBy: [{ sessionDate: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-8">
      <header className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Virtual Morning Reports
        </h1>
        <p className="mt-3 text-base text-gray-500">
          Past cases from The Clinical Problem Solvers
        </p>
      </header>

      <div className="divide-y divide-gray-100">
        {submissions.length ? (
          submissions.map((submission) => (
            <article key={submission.id} className="py-5">
              <Link
                href={buildSubmissionPublicPath(submission.slug!)}
                className="group block"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  {formatDisplayDate(submission.sessionDate)}
                </p>
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-gray-600 transition">
                  {submission.title}
                </h2>
                {submission.chiefComplaint?.trim() ? (
                  <p className="mt-1 text-sm text-gray-500">
                    {submission.chiefComplaint.trim()}
                  </p>
                ) : null}
              </Link>
            </article>
          ))
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">
            No VMRs have been published yet.
          </p>
        )}
      </div>
    </div>
  );
}
