"use client";

import { useState } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = "/admin";
      } else {
        const data = await res.json();
        setError(data.error ?? "Invalid password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      {/* Minimal top strip — no nav, just branding + return home link */}
      <header className="border-b border-border-default bg-surface-secondary">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <a
            href="https://www.searchcps.com"
            className="ml-auto rounded-lg border border-border-default bg-surface-tertiary px-3 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            ← SearchCPS
          </a>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center text-center">
            <Logo wordmark="VMR" size={48} showWordmark={false} />
            <h1 className="mt-4 text-lg font-bold text-text-primary">
              CPS VMR Publisher
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Enter the password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoFocus
            />

            {error && (
              <p className="text-sm text-status-danger">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
