"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VmrCard } from "@/components/vmr-card";
import { formatDisplayDate } from "@/lib/dates";
import { buildSubmissionPublicPath } from "@/lib/public-pages";
import {
  getPublicTemplateLabel,
  getTemplateBadgeStyle,
  resolveArchiveThumbnail,
} from "@/lib/template-display";
import { cn } from "@/lib/ui";

// Mirrors the fields VmrCard needs plus what the list row + search need. React
// keeps Date instances intact across the RSC → client boundary, so sessionDate
// stays a Date (matching VmrCard's prop type). `searchText` is a precomputed,
// lowercased blob (title + chief concern + type label + presenter/discussant
// names) so the client filter is a single cheap substring check.
export type ArchiveSubmission = {
  id: string;
  title: string;
  slug: string | null;
  sessionDate: Date;
  templateType: string;
  chiefComplaint: string | null;
  customTitle: string | null;
  youtubeUrl: string | null;
  thumbnailPath: string | null;
  searchText: string;
};

type ViewMode = "list" | "grid";

// Session dates are stored at T12:00:00Z, so format in UTC to match
// formatDisplayDate and avoid an off-by-one near month boundaries.
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ListRow({ submission }: { submission: ArchiveSubmission }) {
  if (!submission.slug) return null;
  const thumb = resolveArchiveThumbnail(submission);
  const templateLabel = getPublicTemplateLabel(
    submission.templateType,
    submission.customTitle,
  );
  const badgeMuted = getTemplateBadgeStyle(
    submission.templateType,
    submission.customTitle,
  ).muted;
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
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeMuted}`}
      >
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
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
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

  // Search + month filter live in local state (not the URL) so typing doesn't
  // spam history; the view toggle stays in the URL because it's shareable.
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");

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

  // Distinct months present, newest first (submissions arrive sorted desc).
  const months = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of submissions) {
      const key = monthKey(s.sessionDate);
      if (!seen.has(key)) seen.set(key, monthLabel(s.sessionDate));
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [submissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      if (month !== "all" && monthKey(s.sessionDate) !== month) return false;
      if (q && !s.searchText.includes(q)) return false;
      return true;
    });
  }, [submissions, month, query]);

  const isFiltering = query.trim() !== "" || month !== "all";

  function clearFilters() {
    setQuery("");
    setMonth("all");
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
      {/* Toolbar: search + month filter + list/grid toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, chief concern, presenter, or type…"
          aria-label="Search VMRs"
          className="sm:flex-1"
        />
        <div className="flex items-center gap-2">
          {/* A month filter only helps once there's more than one month. */}
          {months.length > 1 && (
            <Select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Filter by month"
              className="w-44"
            >
              <option value="all">All dates</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          )}
          <div
            className="ml-auto flex gap-1"
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
              <span className="hidden sm:inline">List</span>
            </ToggleButton>
            <ToggleButton active={view === "grid"} onClick={() => setView("grid")} label="Grid view">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span className="hidden sm:inline">Grid</span>
            </ToggleButton>
          </div>
        </div>
      </div>

      {isFiltering && (
        <p className="text-xs text-text-muted">
          {filtered.length} of {submissions.length} VMRs
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border-default bg-surface-secondary px-6 py-16 text-center">
          <p className="text-sm font-medium text-text-primary">
            No VMRs match your search.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Clear filters
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((submission) => (
            <VmrCard key={submission.id} submission={submission} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((submission) => (
            <ListRow key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </div>
  );
}
