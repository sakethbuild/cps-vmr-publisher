import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPasswordHash,
} from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "super_admin") {
    return NextResponse.json(
      {
        error:
          "Only super admins can change passwords. Ask the super admin to rotate the shared password from the Users page.",
      },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }

    const ok = await verifyPasswordHash(currentPassword, user.hashedPassword);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 },
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current one." },
        { status: 400 },
      );
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not change password." },
      { status: 500 },
    );
  }
}
