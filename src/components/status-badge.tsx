import type { SubmissionStatus } from "@prisma/client";

import { cn } from "@/lib/ui";

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { bg: string; text: string; dot: string }
> = {
  awaiting_upload: {
    bg: "bg-status-warning-muted",
    text: "text-status-warning",
    dot: "bg-status-warning",
  },
  submitted: {
    bg: "bg-surface-tertiary",
    text: "text-text-secondary",
    dot: "bg-text-muted",
  },
  awaiting_youtube: {
    bg: "bg-status-warning-muted",
    text: "text-status-warning",
    dot: "bg-status-warning",
  },
  ready_to_publish: {
    bg: "bg-status-success-muted",
    text: "text-status-success",
    dot: "bg-status-success",
  },
  published: {
    bg: "bg-status-published-muted",
    text: "text-status-published",
    dot: "bg-status-published",
  },
};

export function formatStatusLabel(status: SubmissionStatus) {
  return status.replaceAll("_", " ");
}

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        config.bg,
        config.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {formatStatusLabel(status)}
    </span>
  );
}
