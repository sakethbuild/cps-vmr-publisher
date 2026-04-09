import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CPS VMR Submissions",
  description: "Internal CPS Virtual Morning Report publishing prototype",
};

const navigation = [
  { href: "/submit", label: "Submit VMR" },
  { href: "/admin", label: "Admin" },
];

function AppNavigation() {
  return (
    <header className="border-b border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            CPS Internal Prototype
          </p>
          <h1 className="mt-2 text-lg font-semibold text-slate-950">
            CPS VMR Submissions
          </h1>
        </div>

        <nav className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-950 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-8 text-xs uppercase tracking-[0.2em] text-slate-500">
      <span>CPS VMR Submissions</span>
      <span>Public publishing workflow ready for local testing</span>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${plexMono.variable} min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_transparent_24%),linear-gradient(180deg,#fffdf8_0%,#f8fafc_50%,#eff6ff_100%)] text-slate-900 antialiased`}
      >
        <div className="min-h-screen">
          <AppNavigation />
          <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
