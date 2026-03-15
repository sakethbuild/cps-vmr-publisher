import type { SubmissionStatus } from "@prisma/client";

import { cn } from "@/lib/ui";

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  submitted: "border-slate-300 bg-slate-100 text-slate-700",
  awaiting_youtube: "border-amber-300 bg-amber-100 text-amber-800",
  ready_for_draft: "border-emerald-300 bg-emerald-100 text-emerald-800",
  wordpress_draft_created: "border-sky-300 bg-sky-100 text-sky-800",
  published: "border-violet-300 bg-violet-100 text-violet-800",
};

export function formatStatusLabel(status: SubmissionStatus) {
  return status.replaceAll("_", " ");
}

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize tracking-[0.12em]",
        STATUS_STYLES[status],
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
