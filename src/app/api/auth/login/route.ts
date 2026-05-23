import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthToken, getAuthCookieConfig } from "@/lib/auth";
import { isValidEmail, verifyPasswordHash } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Body parsing is a *client* failure mode (malformed JSON, missing body) —
  // treat it as 400, not 500. Mapping client errors to 500 noises up monitoring
  // and makes real server failures harder to find.
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON with email and password fields." },
      { status: 400 },
    );
  }

  try {
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const ok = await verifyPasswordHash(password, user.hashedPassword);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = await createAuthToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set(getAuthCookieConfig(token));

    return NextResponse.json({
      success: true,
      role: user.role,
      email: user.email,
    });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
