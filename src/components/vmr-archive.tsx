"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { TEMPLATE_TYPE_LABELS } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/dates";
import { buildSubmissionPublicPath } from "@/lib/public-pages";
import { cn } from "@/lib/ui";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";
import { VmrCard } from "@/components/vmr-card";

// Mirrors the fields VmrCard needs plus what the list row renders. React keeps
// Date instances intact across the RSC → client boundary, so sessionDate stays a
// Date (matching VmrCard's prop type).
export type ArchiveSubmission = {
  id: string;
  title: string;
  slug: string | null;
  sessionDate: Date;
  templateType: string;
  chiefComplaint: string | null;
  youtubeUrl: string | null;
  thumbnailPath: string | null;
};

type ViewMode = "list" | "grid";

function resolveThumbnail(s: ArchiveSubmission): string | null {
  if (s.youtubeUrl?.trim()) {
    const yt = getYouTubeThumbnailUrl(s.youtubeUrl);
    if (yt) return yt;
  }
  return s.thumbnailPath;
}

function ListRow({ submission }: { submission: ArchiveSubmission }) {
  if (!submission.slug) return null;
  const thumb = resolveThumbnail(submission);
  const templateLabel =
    TEMPLATE_TYPE_LABELS[submission.templateType] ?? submission.templateType;
  const rowTitle = submission.chiefComplaint?.trim() || templateLabel;

  return (
    <Link
      href={buildSubmissionPublicPath(submission.slug)}
      className="group flex items-center gap-4 rounded-[10px] border border-border-default bg-surface-secondary px-4 py-3 transition-colors hover:border-accent"
    >
      <div className="relative hidden h-[54px] w-24 shrink-0 overflow-hidden rounded-md bg-surface-tertiary sm:block">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-accent">
          {rowTitle}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {formatDisplayDate(submission.sessionDate)}
        </p>
      </div>
      <span className="shrink-0 rounded-md bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {templateLabel}
      </span>
    </Link>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent-muted text-accent"
          : "text-text-muted hover:bg-surface-tertiary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function VmrArchive({
  submissions,
}: {
  submissions: ArchiveSubmission[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // List is the default (closer to the main CPS site + easier to scan older VMRs).
  const view: ViewMode = searchParams.get("view") === "grid" ? "grid" : "list";

  function setView(next: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") {
      params.delete("view"); // list is the default — keep the URL clean
    } else {
      params.set("view", next);
    }
    const qs = params.toString();
    router.replace(qs ? `/vmr?${qs}` : "/vmr", { scroll: false });
  }

  if (submissions.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-border-default bg-surface-secondary px-6 py-16 text-center">
        <p className="text-sm font-medium text-text-primary">No published VMRs yet.</p>
        <p className="mt-2 text-sm text-text-muted">
          New cases will appear here once the team publishes them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="flex justify-end gap-1"
        role="group"
        aria-label="Choose how to view the archive"
      >
        <ToggleButton active={view === "list"} onClick={() => setView("list")} label="List view">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          List
        </ToggleButton>
        <ToggleButton active={view === "grid"} onClick={() => setView("grid")} label="Grid view">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Grid
        </ToggleButton>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((submission) => (
            <VmrCard key={submission.id} submission={submission} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {submissions.map((submission) => (
            <ListRow key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </div>
  );
}
