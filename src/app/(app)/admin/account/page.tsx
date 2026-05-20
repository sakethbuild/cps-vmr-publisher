export const dynamic = "force-dynamic";

import { requireUserOrRedirect } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function AccountPage() {
  const user = await requireUserOrRedirect();
  const isSuperAdmin = user.role === "super_admin";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-text-primary">Account</h1>
        <p className="mt-1 text-sm text-text-muted">{user.email}</p>
      </header>

      {isSuperAdmin ? (
        <Card>
          <h2 className="text-sm font-semibold text-text-primary">Change password</h2>
          <p className="mt-1 text-xs text-text-muted">
            Pick a password of at least 8 characters. You'll stay signed in after the change.
          </p>
          <ChangePasswordForm />
        </Card>
      ) : (
        <Card>
          <h2 className="text-sm font-semibold text-text-primary">
            Password managed by super admin
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            This account is shared across the academy. To rotate the password or update
            credentials, ask the super admin to do it from the Users page.
          </p>
        </Card>
      )}
    </div>
  );
}
