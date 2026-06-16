import Image from "next/image";
import Link from "next/link";

import { formatDisplayDate } from "@/lib/dates";
import { TEMPLATE_TYPE_LABELS } from "@/lib/constants";
import { buildSubmissionPublicPath } from "@/lib/public-pages";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

type VmrCardSubmission = {
  id: string;
  title: string;
  slug: string | null;
  sessionDate: Date;
  templateType: string;
  chiefComplaint: string | null;
  youtubeUrl: string | null;
  thumbnailPath: string | null;
};

const TEMPLATE_GRADIENTS: Record<string, string> = {
  standard: "from-accent/20 to-accent/5",
  raphael_medina_subspecialty: "from-status-published/25 to-status-published/5",
  img_vmr: "from-status-warning/25 to-status-warning/5",
  sunday_fundamentals: "from-status-success/25 to-status-success/5",
  simplicity_in_complexity_vmr: "from-accent/20 to-accent/5",
  academy_session: "from-status-warning/25 to-status-warning/5",
  mainstream_mondays: "from-status-published/25 to-status-published/5",
  custom: "from-surface-tertiary to-surface-secondary",
};

function resolveThumbnail(submission: VmrCardSubmission): string | null {
  // F6: prefer the YouTube video still when there's a recording; fall back to
  // the auto-generated PDF whiteboard when there's no video link.
  if (submission.youtubeUrl?.trim()) {
    const ytThumb = getYouTubeThumbnailUrl(submission.youtubeUrl);
    if (ytThumb) return ytThumb;
  }
  return submission.thumbnailPath;
}

export function VmrCard({ submission }: { submission: VmrCardSubmission }) {
  if (!submission.slug) return null;

  const thumbnail = resolveThumbnail(submission);
  const gradientClass =
    TEMPLATE_GRADIENTS[submission.templateType] ?? TEMPLATE_GRADIENTS.custom;
  const templateLabel =
    TEMPLATE_TYPE_LABELS[submission.templateType] ?? submission.templateType;
  // F8: card title is the chief concern (the human-meaningful part), falling
  // back to the VMR type label when there's no chief concern. The date shows
  // once underneath — no more title-baked date + redundant chief-concern block.
  const cardTitle = submission.chiefComplaint?.trim() || templateLabel;

  return (
    <Link
      href={buildSubmissionPublicPath(submission.slug)}
      className="group block overflow-hidden rounded-[10px] border border-border-default bg-surface-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-tertiary">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientClass}`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {templateLabel}
            </span>
          </div>
        )}
        <span className="absolute right-2 top-2 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
          {templateLabel}
        </span>
      </div>

      <div className="px-4 py-3.5">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent">
          {cardTitle}
        </h2>
        <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
          <span>{formatDisplayDate(submission.sessionDate)}</span>
        </div>
      </div>
    </Link>
  );
}
