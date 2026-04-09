export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/lib/dates";
import { buildSubmissionPublicPath } from "@/lib/public-pages";
import { TEMPLATE_TYPE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

const TEMPLATE_COLORS: Record<string, string> = {
  standard: "from-teal-500/20 to-teal-600/5",
  raphael_medina_subspecialty: "from-violet-500/20 to-violet-600/5",
  img_vmr: "from-amber-500/20 to-amber-600/5",
  sunday_fundamentals: "from-emerald-500/20 to-emerald-600/5",
  custom: "from-slate-500/20 to-slate-600/5",
};

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
          Past cases from The Clinical Problem Solvers
        </p>
      </header>

      {submissions.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((submission) => {
            const thumbnail = submission.youtubeUrl
              ? getYouTubeThumbnailUrl(submission.youtubeUrl)
              : null;
            const hasPreview = Boolean(submission.previewImagePath);
            const gradientClass =
              TEMPLATE_COLORS[submission.templateType] ?? TEMPLATE_COLORS.custom;

            return (
              <Link
                key={submission.id}
                href={buildSubmissionPublicPath(submission.slug!)}
                className="group block overflow-hidden rounded-xl border border-border-default bg-surface-secondary transition hover:border-border-strong hover:shadow-sm"
              >
                {/* Thumbnail area */}
                <div className="relative aspect-video overflow-hidden bg-surface-tertiary">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : hasPreview ? (
                    <Image
                      src={`/uploads/${submission.id}/preview`}
                      alt=""
                      fill
                      className="object-cover transition group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientClass}`}>
                      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                        {TEMPLATE_TYPE_LABELS[submission.templateType] ?? submission.templateType}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4">
                  <p className="text-xs text-text-muted">
                    {formatDisplayDate(submission.sessionDate)}
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-text-primary line-clamp-2 group-hover:text-accent transition-colors">
                    {submission.title}
                  </h2>
                  {submission.chiefComplaint?.trim() && (
                    <p className="mt-1.5 text-xs text-text-muted line-clamp-1">
                      {submission.chiefComplaint.trim()}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-text-muted">
          No VMRs have been published yet.
        </p>
      )}
    </div>
  );
}
