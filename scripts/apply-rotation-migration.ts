/**
 * Apply the whiteboard-rotation column migration to the Turso production DB.
 *
 * AUTHORIZED BY USER via AskUserQuestion ("Build a Rotate-whiteboard tool" —
 * which explicitly accepts "a small one-column production database migration").
 *
 * Statement applied (additive only — no data is touched):
 *   ALTER TABLE Submission ADD COLUMN thumbnailRotation INTEGER NOT NULL DEFAULT 0;
 *
 * Wrapped in a column-presence check so re-runs are safe.
 */

import "dotenv/config";
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env");
  }

  const client = createClient({ url, authToken });

  const cols = await client.execute("PRAGMA table_info(Submission)");
  const existing = new Set(cols.rows.map((r) => String(r.name)));

  const op = {
    name: "thumbnailRotation",
    sql: "ALTER TABLE Submission ADD COLUMN thumbnailRotation INTEGER NOT NULL DEFAULT 0",
  };

  if (existing.has(op.name)) {
    console.log(`SKIP ${op.name}: already exists`);
  } else {
    console.log(`APPLY ${op.sql};`);
    await client.execute(op.sql);
  }

  console.log("\nVerifying...");
  const after = await client.execute("PRAGMA table_info(Submission)");
  const afterNames = new Set(after.rows.map((r) => String(r.name)));
  if (!afterNames.has(op.name)) {
    throw new Error(`Verification failed: ${op.name} missing after migration`);
  }
  console.log(`OK ${op.name} present`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
