import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CPS Virtual Morning Report",
  description: "Virtual Morning Report — The Clinical Problem Solvers",
};

function CpsHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-4 sm:px-6">
        <Link href="/vmr" className="flex items-center gap-3 transition hover:opacity-80">
          <Image
            src="/cps-logo.svg"
            alt="The Clinical Problem Solvers"
            width={44}
            height={44}
            className="rounded-lg"
            priority
          />
          <span className="text-base font-semibold text-gray-900 sm:text-lg">
            The Clinical Problem Solvers
          </span>
        </Link>
      </div>
    </header>
  );
}

function CpsFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/cps-logo.svg"
            alt="The Clinical Problem Solvers"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="text-sm text-gray-500">The Clinical Problem Solvers</span>
        </div>
        <a
          href="https://clinicalproblemsolving.com"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-gray-400 transition hover:text-gray-700"
        >
          clinicalproblemsolving.com
        </a>
      </div>
    </footer>
  );
}

export default function PublicVmrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <CpsHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {children}
      </main>
      <CpsFooter />
    </div>
  );
}
