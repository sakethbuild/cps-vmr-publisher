import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/auth";
import { hashPassword, isValidEmail, validatePasswordStrength } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      role?: "member" | "super_admin";
    };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const role = body.role ?? "member";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Email is required and must be valid." },
        { status: 400 },
      );
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }

    if (role !== "member" && role !== "super_admin") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, hashedPassword, role },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user, initialPassword: password });
  } catch {
    return NextResponse.json({ error: "Could not create user." }, { status: 500 });
  }
}
