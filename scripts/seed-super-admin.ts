import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();

  const email = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@cps.local";
  const password =
    process.env.SEED_ADMIN_PASSWORD?.trim() ||
    process.env.SUPER_ADMIN_PASSWORD?.trim() ||
    null;

  if (!password) {
    console.error(
      "No seed password. Set SEED_ADMIN_PASSWORD or SUPER_ADMIN_PASSWORD in .env.",
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin already exists: ${email}`);
    await prisma.$disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, hashedPassword, role: "super_admin" },
  });

  console.log(`Created super admin: ${user.email}`);
  console.log(`Sign in at /login with this email and the password from .env`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
