import { Sidebar, MobileHeader } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const role = user?.role ?? null;
  const email = user?.email ?? null;
  return (
    <div className="min-h-screen">
      <Sidebar role={role} email={email} />
      <MobileHeader role={role} email={email} />
      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
