import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { buildSubmissionPublicPath } from "@/lib/public-pages";
import { SUBMISSION_STATUS_OPTIONS } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

type AdminPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = (await searchParams) ?? {};
  const selectedStatus = params.status;
  const where =
    selectedStatus && SUBMISSION_STATUS_OPTIONS.includes(selectedStatus as never)
      ? { status: selectedStatus as (typeof SUBMISSION_STATUS_OPTIONS)[number] }
      : {};

  const [submissions, groupedStatuses] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.submission.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const totalSubmissions = groupedStatuses.reduce(
    (total, group) => total + group._count._all,
    0,
  );
  const awaitingYoutubeCount =
    groupedStatuses.find((group) => group.status === "awaiting_youtube")?._count
      ._all ?? 0;
  const readyCount =
    groupedStatuses.find((group) => group.status === "ready_to_publish")?._count
      ._all ?? 0;
  const publishedCount =
    groupedStatuses.find((group) => group.status === "published")?._count._all ??
    0;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Admin dashboard
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Review and publish VMR submissions
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Filter by workflow status, review submissions, update content, and
              publish live public pages when everything is ready.
            </p>
          </div>

          <Link
            href="/submit"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Create a new submission
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/admin"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              !selectedStatus
                ? "bg-slate-950 text-white"
                : "border border-slate-300 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
            }`}
          >
            All
          </Link>
          {SUBMISSION_STATUS_OPTIONS.map((status) => (
            <Link
              key={status}
              href={`/admin?status=${status}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedStatus === status
                  ? "bg-slate-950 text-white"
                  : "border border-slate-300 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              }`}
            >
              {status.replaceAll("_", " ")}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Total
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {totalSubmissions}
          </p>
        </div>
        <div className="rounded-[2rem] border border-amber-200 bg-[linear-gradient(135deg,#fff8eb,white)] p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Awaiting YouTube
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {awaitingYoutubeCount}
          </p>
        </div>
        <div className="rounded-[2rem] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5,white)] p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Ready to publish
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{readyCount}</p>
        </div>
        <div className="rounded-[2rem] border border-sky-200 bg-[linear-gradient(135deg,#eff6ff,white)] p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Public pages live
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{publishedCount}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr className="text-slate-500">
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Template</th>
              <th className="px-4 py-3 font-semibold">Session date</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Public page</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {submissions.length ? (
              submissions.map((submission) => (
                <tr key={submission.id} className="transition hover:bg-slate-50/80">
                  <td className="px-4 py-4 font-medium text-slate-900">
                    <Link
                      href={`/admin/submissions/${submission.id}`}
                      className="transition hover:text-sky-700"
                    >
                      {submission.title}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {submission.templateType.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatDisplayDate(submission.sessionDate)}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatDisplayDate(submission.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={submission.status} />
                  </td>
                  <td className="px-4 py-4">
                    {submission.status === "published" && submission.slug ? (
                      <Link
                        href={buildSubmissionPublicPath(submission.slug)}
                        className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-3"
                      >
                        Open live page
                      </Link>
                    ) : (
                      <span className="text-slate-400">Not live yet</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={6}>
                  No submissions match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
