import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import type { User, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "vmr_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type { UserRole };

function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-secret-change-me";
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function payloadToSign(userId: string, ts: string): string {
  return `${userId}:${ts}`;
}

export async function createAuthToken(userId: string): Promise<string> {
  const ts = Date.now().toString();
  const sig = await hmacSign(payloadToSign(userId, ts), getAuthSecret());
  return `${userId}.${ts}.${sig}`;
}

type DecodedToken = { valid: true; userId: string } | { valid: false };

export async function decodeAuthToken(token: string): Promise<DecodedToken> {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };
  const [userId, ts, sig] = parts;
  if (!userId || !ts || !sig) return { valid: false };

  const age = Date.now() - Number(ts);
  if (Number.isNaN(age) || age > COOKIE_MAX_AGE * 1000) return { valid: false };

  const expectedSig = await hmacSign(payloadToSign(userId, ts), getAuthSecret());
  if (sig !== expectedSig) return { valid: false };

  return { valid: true, userId };
}

export function getAuthCookieConfig(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function getClearAuthCookieConfig() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = await decodeAuthToken(token);
  if (!decoded.valid) return null;

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  return user;
}

export async function getCurrentRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user?.role ?? null;
}

export async function requireInternalAccess(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

export async function requireSuperAdmin(): Promise<boolean> {
  return (await getCurrentRole()) === "super_admin";
}

export async function requireUserOrRedirect(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireSuperAdminOrNotFound(): Promise<User> {
  const user = await requireUserOrRedirect();
  if (user.role !== "super_admin") {
    notFound();
  }
  return user;
}

export { COOKIE_NAME };
