export const dynamic = "force-dynamic";

import Link from "next/link";

import { AdminTable } from "@/components/admin-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDisplayDate } from "@/lib/dates";
import { requireUserOrRedirect } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const user = await requireUserOrRedirect();
  const role = user.role;

  const [submissions, groupedStatuses] = await Promise.all([
    prisma.submission.findMany({
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.submission.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const totalSubmissions = groupedStatuses.reduce(
    (total, group) => total + group._count._all,
    0,
  );
  const counts: Record<string, number> = {};
  for (const group of groupedStatuses) {
    counts[group.status] = group._count._all;
  }

  const stats = [
    { label: "Total", value: totalSubmissions, color: "text-text-primary" },
    {
      label: "Awaiting YouTube",
      value: counts["awaiting_youtube"] ?? 0,
      color: "text-status-warning",
    },
    {
      label: "Ready",
      value: counts["ready_to_publish"] ?? 0,
      color: "text-status-success",
    },
    {
      label: "Published",
      value: counts["published"] ?? 0,
      color: "text-status-published",
    },
  ];

  const isSuperAdmin = role === "super_admin";
  const reviewQueue = isSuperAdmin
    ? submissions.filter((s) => s.status === "ready_to_publish")
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
          {role && (
            <span
              className={
                isSuperAdmin
                  ? "inline-flex items-center rounded-md bg-status-published-muted px-2 py-0.5 text-xs font-medium text-status-published"
                  : "inline-flex items-center rounded-md bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-secondary"
              }
            >
              {isSuperAdmin ? "Super admin" : "Member"}
            </span>
          )}
        </div>
        <Link href="/submit" className="shrink-0">
          <Button size="md" className="whitespace-nowrap">New submission</Button>
        </Link>
      </div>

      <Card className="grid grid-cols-2 gap-px bg-border-default p-0 overflow-hidden sm:flex sm:items-center sm:gap-0 sm:divide-x sm:divide-border-default sm:bg-surface-secondary">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-secondary flex-1 min-w-0 px-5 py-4 sm:min-w-[120px]"
          >
            <p className="text-xs font-medium text-text-muted">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </Card>

      {isSuperAdmin && reviewQueue.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Awaiting your review
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Submissions marked Ready by a member. Click into one to publish.
              </p>
            </div>
            <span className="rounded-md bg-status-success-muted px-2 py-0.5 text-xs font-medium text-status-success">
              {reviewQueue.length}
            </span>
          </div>
          <ul className="divide-y divide-border-default">
            {reviewQueue.map((submission) => (
              <li key={submission.id}>
                <Link
                  href={`/admin/submissions/${submission.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-surface-tertiary -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {submission.title}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatDisplayDate(submission.sessionDate)}
                    </p>
                  </div>
                  <StatusBadge status={submission.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AdminTable
        submissions={submissions.map((s) => ({
          id: s.id,
          title: s.title,
          templateType: s.templateType,
          sessionDate: s.sessionDate.toISOString(),
          createdAt: s.createdAt.toISOString(),
          status: s.status,
          slug: s.slug,
        }))}
      />
    </div>
  );
}
