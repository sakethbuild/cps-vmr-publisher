"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDisplayDate } from "@/lib/dates";

export type UserListItem = {
  id: string;
  email: string;
  role: "member" | "super_admin";
  createdAt: string;
};

type CreatedUserNotice = {
  email: string;
  initialPassword: string;
};

export function UsersClient({ initialUsers }: { initialUsers: UserListItem[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "super_admin">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdNotice, setCreatedNotice] = useState<CreatedUserNotice | null>(null);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, role }),
      });
      const data = (await response.json()) as {
        user?: UserListItem;
        initialPassword?: string;
        error?: string;
      };
      if (!response.ok || !data.user) {
        setError(data.error ?? "Could not create user.");
        return;
      }
      setUsers((current) => [data.user!, ...current]);
      setCreatedNotice({
        email: data.user.email,
        initialPassword: data.initialPassword ?? password,
      });
      setEmail("");
      setPassword("");
      setRole("member");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id: string, nextRole: "member" | "super_admin") {
    setError(null);
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Could not update role.");
      return;
    }
    setUsers((current) =>
      current.map((u) => (u.id === id ? { ...u, role: nextRole } : u)),
    );
  }

  async function resetPassword(id: string, email: string) {
    setError(null);
    const newPassword = window.prompt(
      `Enter a new password for ${email} (min 8 chars):`,
    );
    if (!newPassword) return;
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Could not reset password.");
      return;
    }
    setCreatedNotice({ email, initialPassword: newPassword });
  }

  async function deleteUser(id: string, email: string) {
    setError(null);
    if (!window.confirm(`Delete user ${email}? This cannot be undone.`)) return;
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Could not delete user.");
      return;
    }
    setUsers((current) => current.filter((u) => u.id !== id));
  }

  return (
    <div className="space-y-5">
      {createdNotice && (
        <Card className="border-status-success/40 bg-status-success-muted">
          <p className="text-sm font-medium text-status-success">
            Password set for {createdNotice.email}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Share this password with them privately. They can change it after signing in
            at /admin/account.
          </p>
          <code className="mt-3 block rounded-md bg-surface-tertiary px-3 py-2 font-mono text-sm text-text-primary">
            {createdNotice.initialPassword}
          </code>
          <button
            type="button"
            className="mt-3 text-xs font-medium text-accent hover:text-accent-hover"
            onClick={() => setCreatedNotice(null)}
          >
            Dismiss
          </button>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-text-primary">Add user</h2>
        <p className="mt-1 text-xs text-text-muted">
          The user signs in with this email and the password you set. Only super admins
          can change it later — useful when the whole academy shares one login.
        </p>
        <form className="mt-4 grid gap-3 md:grid-cols-[2fr_1.5fr_1fr_auto]" onSubmit={createUser}>
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
          />
          <Input
            type="text"
            placeholder="Initial password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="off"
          />
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "super_admin")}
          >
            <option value="member">Member</option>
            <option value="super_admin">Super admin</option>
          </Select>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding..." : "Add user"}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-status-danger">{error}</p>}
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-default bg-surface-tertiary">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                Email
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                Role
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                Added
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium text-text-primary">{user.email}</td>
                <td className="px-4 py-3">
                  <Select
                    value={user.role}
                    onChange={(e) =>
                      changeRole(user.id, e.target.value as "member" | "super_admin")
                    }
                    className="max-w-[140px]"
                  >
                    <option value="member">Member</option>
                    <option value="super_admin">Super admin</option>
                  </Select>
                </td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {formatDisplayDate(new Date(user.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => resetPassword(user.id, user.email)}
                    >
                      Reset password
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => deleteUser(user.id, user.email)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
