// Additive-only bootstrap for production Turso.
// Creates User table + uploadConfirmedAt column + the first super admin.
// Does NOT drop previewImagePath / previewImageMimeType — those stay as
// unused columns on existing rows. Safe to re-run (every step is idempotent).

import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@cps.com";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD?.trim() ||
    process.env.SUPER_ADMIN_PASSWORD?.trim();
  if (!adminPassword) {
    console.error("Missing SEED_ADMIN_PASSWORD or SUPER_ADMIN_PASSWORD");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  console.log("Step 1/3: ensure User table exists");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "hashedPassword" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'member',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("  ok");

  console.log("Step 2/3: ensure Submission.uploadConfirmedAt column exists");
  const tableInfo = await client.execute(`PRAGMA table_info("Submission")`);
  const hasConfirmedAt = tableInfo.rows.some((r) => r.name === "uploadConfirmedAt");
  if (hasConfirmedAt) {
    console.log("  column already exists, skipping");
  } else {
    await client.execute(`ALTER TABLE "Submission" ADD COLUMN "uploadConfirmedAt" DATETIME`);
    console.log("  added");
  }

  console.log("Step 3/3: create super admin user");
  const existing = await client.execute({
    sql: `SELECT id FROM "User" WHERE email = ?`,
    args: [adminEmail],
  });
  if (existing.rows.length > 0) {
    console.log(`  super admin ${adminEmail} already exists, skipping (re-run is idempotent)`);
  } else {
    const id = `cm${Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(36))
      .join("")
      .slice(0, 24)}`;
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const nowIso = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO "User" (id, email, hashedPassword, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, adminEmail, hashedPassword, "super_admin", nowIso, nowIso],
    });
    console.log(`  created ${adminEmail} as super_admin`);
  }

  console.log("\nDone. Submission data unchanged. previewImagePath columns left intact.");
  console.log(`Log in at your Vercel URL /login with ${adminEmail} and the password you provided.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
