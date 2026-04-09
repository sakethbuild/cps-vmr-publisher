"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildSubmissionPublicPath } from "@/lib/public-pages";
import { cn } from "@/lib/ui";

type SubmissionRow = {
  id: string;
  title: string;
  templateType: string;
  sessionDate: string;
  createdAt: string;
  status: string;
  slug: string | null;
};

type SortKey = "title" | "sessionDate" | "createdAt" | "status";
type SortDir = "asc" | "desc";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "awaiting_youtube", label: "Awaiting YouTube" },
  { value: "ready_to_publish", label: "Ready" },
  { value: "published", label: "Published" },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function templateBadgeVariant(
  type: string,
): "default" | "accent" | "success" | "warning" | "published" {
  switch (type) {
    case "standard":
      return "default";
    case "raphael_medina_subspecialty":
      return "accent";
    case "img_vmr":
      return "warning";
    case "sunday_fundamentals":
      return "success";
    case "custom":
      return "published";
    default:
      return "default";
  }
}

export function AdminTable({
  submissions,
}: {
  submissions: SubmissionRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = submissions;
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.title.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [submissions, search, statusFilter, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return (
      <span className="ml-1 text-accent">
        {sortDir === "asc" ? "\u2191" : "\u2193"}
      </span>
    );
  };

  const sortableHeader = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="inline-flex items-center gap-0.5 hover:text-text-primary transition-colors"
    >
      {label}
      <SortIcon col={key} />
    </button>
  );

  return (
    <Card className="p-0 overflow-hidden">
      {/* Toolbar: filters + search */}
      <div className="flex flex-col gap-3 border-b border-border-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-accent-muted text-accent"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-tertiary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input
          type="search"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <tr>
            <TableHead>{sortableHeader("title", "Title")}</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>{sortableHeader("sessionDate", "Session")}</TableHead>
            <TableHead>{sortableHeader("createdAt", "Created")}</TableHead>
            <TableHead>{sortableHeader("status", "Status")}</TableHead>
            <TableHead>Public</TableHead>
            <TableHead></TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {filtered.length ? (
            filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/submissions/${row.id}`}
                    className="text-text-primary hover:text-accent transition-colors"
                  >
                    {row.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={templateBadgeVariant(row.templateType)}>
                    {row.templateType.replaceAll("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-text-secondary whitespace-nowrap">
                  {formatDate(row.sessionDate)}
                </TableCell>
                <TableCell className="text-text-secondary whitespace-nowrap">
                  {formatDate(row.createdAt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status as never} />
                </TableCell>
                <TableCell>
                  {row.status === "published" && row.slug ? (
                    <Link
                      href={buildSubmissionPublicPath(row.slug)}
                      className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-text-muted text-xs">--</span>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id, row.title)}
                    disabled={deletingId === row.id}
                    className="rounded-md p-1 text-text-muted hover:bg-status-danger-muted hover:text-status-danger transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-text-muted">
                No submissions match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
