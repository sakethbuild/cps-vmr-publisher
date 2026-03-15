import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { formatDisplayDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [submissions, grouped] = await Promise.all([
    prisma.submission.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.submission.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const totalSubmissions = grouped.reduce(
    (total, current) => total + current._count._all,
    0,
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        <div className="rounded-[2.25rem] border border-white/70 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(255,255,255,0.95)_38%,rgba(251,191,36,0.18))] p-8 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Virtual Morning Report workflow
          </p>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Submit, review, and prep VMR pages before they reach WordPress.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            This prototype keeps the CPS team’s submission flow in one place:
            structured presenters and discussants, clean upload handling, ready
            states, and safe mock publishing for draft testing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/submit"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open submission form
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
            >
              Open admin dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Total submissions
            </p>
            <p className="mt-3 text-4xl font-semibold text-slate-950">
              {totalSubmissions}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Status breakdown
            </p>
            <div className="mt-4 space-y-3">
              {grouped.length ? (
                grouped.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <StatusBadge status={item.status} />
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      {item._count._all}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Seed the database or submit the first VMR to populate this
                  dashboard.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Recent submissions
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              Latest activity
            </h3>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
          >
            View all submissions
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="text-slate-500">
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Template</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {submissions.length ? (
                submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      <Link
                        href={`/admin/submissions/${submission.id}`}
                        className="transition hover:text-sky-700"
                      >
                        {submission.title}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatDisplayDate(submission.sessionDate)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={submission.status} />
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {submission.templateType.replaceAll("_", " ")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={4}>
                    No submissions yet. Use the form to add the first VMR or run
                    the seed script to load examples.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
