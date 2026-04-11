import type { Metadata } from "next";

import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "CPS Virtual Morning Report",
  description: "Virtual Morning Report — The Clinical Problem Solvers",
};

export default function PublicVmrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-primary">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="mt-16 border-t border-border-default">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-8 text-xs text-text-muted sm:flex-row sm:justify-between sm:px-6">
          <span>The Clinical Problem Solvers · Virtual Morning Report</span>
          <a
            href="https://clinicalproblemsolving.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-accent"
          >
            clinicalproblemsolving.com
          </a>
        </div>
      </footer>
    </div>
  );
}
