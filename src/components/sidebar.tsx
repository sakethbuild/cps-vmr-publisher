"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/ui";

const baseNavItems = [
  {
    href: "/submit",
    label: "Submit VMR",
    superAdminOnly: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "Dashboard",
    superAdminOnly: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Users",
    superAdminOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/vmr",
    label: "Public Archive",
    superAdminOnly: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    href: "/admin/account",
    label: "Account",
    superAdminOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

function NavLink({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent-muted text-accent"
          : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

type SidebarRole = "member" | "super_admin" | null;

function RoleChip({ role }: { role: SidebarRole }) {
  if (!role) return null;
  const isSuper = role === "super_admin";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
        isSuper
          ? "bg-status-published-muted text-status-published"
          : "bg-surface-tertiary text-text-secondary",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isSuper ? "bg-status-published" : "bg-text-muted",
        )}
      />
      {isSuper ? "Super admin" : "Member"}
    </span>
  );
}

function SidebarContent({
  onNavigate,
  role,
  email,
}: {
  onNavigate?: () => void;
  role: SidebarRole;
  email?: string | null;
}) {
  const pathname = usePathname();
  const navItems = baseNavItems.filter(
    (item) => !item.superAdminOnly || role === "super_admin",
  );

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link
          href="/vmr"
          onClick={onNavigate}
          className="inline-flex transition-opacity hover:opacity-80"
          aria-label="CPS VMR"
        >
          <Logo wordmark="VMR" size={32} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname.startsWith(item.href)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {role && (
        <div className="border-t border-border-default px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Signed in as
          </p>
          {email && (
            <p className="mt-1 truncate text-xs font-medium text-text-primary" title={email}>
              {email}
            </p>
          )}
          <div className="mt-1.5">
            <RoleChip role={role} />
          </div>
        </div>
      )}

      <div className="space-y-1 border-t border-border-default px-3 py-3">
        <a
          href="https://www.searchcps.com"
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-tertiary hover:text-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          SearchCPS
        </a>
        <ThemeToggle className="w-full justify-start" />
        <button
          type="button"
          onClick={() => {
            fetch("/api/auth/logout", { method: "POST" }).then(() => {
              window.location.href = "/login";
            });
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Sidebar({
  role,
  email,
}: {
  role: SidebarRole;
  email?: string | null;
}) {
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border-default bg-surface-secondary">
      <SidebarContent role={role} email={email} />
    </aside>
  );
}

export function MobileHeader({
  role,
  email,
}: {
  role: SidebarRole;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border-default bg-surface-secondary px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-tertiary"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Logo wordmark="VMR" size={28} />
        <span className="ml-auto">
          <RoleChip role={role} />
        </span>
      </header>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-surface-secondary shadow-xl md:hidden">
            <div className="flex items-center justify-end px-4 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-tertiary"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <SidebarContent role={role} email={email} onNavigate={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
