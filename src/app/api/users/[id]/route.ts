import { NextResponse } from "next/server";

import { getCurrentUser, requireSuperAdmin } from "@/lib/auth";
import { hashPassword, validatePasswordStrength } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteProps) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      role?: "member" | "super_admin";
      newPassword?: string;
    };

    const updates: { role?: "member" | "super_admin"; hashedPassword?: string } = {};

    if (body.role) {
      if (body.role !== "member" && body.role !== "super_admin") {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }
      updates.role = body.role;
    }

    if (body.newPassword !== undefined) {
      const strengthError = validatePasswordStrength(body.newPassword);
      if (strengthError) {
        return NextResponse.json({ error: strengthError }, { status: 400 });
      }
      updates.hashedPassword = await hashPassword(body.newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: updates,
      select: { id: true, email: true, role: true, updatedAt: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update user." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (currentUser?.id === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.role === "super_admin") {
      const superAdminCount = await prisma.user.count({
        where: { role: "super_admin" },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last super admin." },
          { status: 400 },
        );
      }
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete user." },
      { status: 500 },
    );
  }
}
