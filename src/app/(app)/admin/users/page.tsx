export const dynamic = "force-dynamic";

import { requireSuperAdminOrNotFound } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersClient, type UserListItem } from "@/components/users-client";

export default async function UsersPage() {
  await requireSuperAdminOrNotFound();

  const usersRaw = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const users: UserListItem[] = usersRaw.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-text-primary">Users</h1>
        <p className="mt-1 text-sm text-text-muted">
          Manage academy members and super admins. Only super admins can view this page.
        </p>
      </header>
      <UsersClient initialUsers={users} />
    </div>
  );
}
