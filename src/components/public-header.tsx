import Link from "next/link";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Top header used on public-facing routes (`/vmr`, `/vmr/[slug]`, `/login`).
 *
 * Visually matches the SearchCPS header (sticky surface bar, subtle border,
 * max-width container) so navigating between searchcps.com and the publisher
 * feels like staying inside the same product.
 */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-surface-secondary/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6">
        <Link
          href="/vmr"
          className="transition-opacity hover:opacity-80"
          aria-label="CPS VMR archive"
        >
          <Logo wordmark="VMR" />
        </Link>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/vmr"
            className="rounded-lg border border-transparent px-3 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            Archive
          </Link>
          <Link
            href="/submit"
            className="rounded-lg border border-transparent px-3 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            Submit a VMR
          </Link>
          <a
            href="https://www.searchcps.com"
            className="ml-1 hidden rounded-lg border border-border-default bg-surface-tertiary px-3 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent sm:inline-flex"
          >
            ← SearchCPS
          </a>
          <ThemeToggle className="hidden sm:inline-flex" />
        </nav>
      </div>
    </header>
  );
}
