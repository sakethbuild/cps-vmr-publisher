"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setFeedback({ tone: "error", message: data.error ?? "Could not change password." });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setFeedback({ tone: "success", message: "Password updated." });
    } catch {
      setFeedback({ tone: "error", message: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <Input
        type="password"
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      <Input
        type="password"
        placeholder="New password (min 8 chars)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        autoComplete="new-password"
        minLength={8}
      />
      {feedback && (
        <p
          className={
            feedback.tone === "success"
              ? "text-sm text-status-success"
              : "text-sm text-status-danger"
          }
        >
          {feedback.message}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
