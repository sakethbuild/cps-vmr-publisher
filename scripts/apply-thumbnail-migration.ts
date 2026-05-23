/**
 * Apply the thumbnail-column migration to the Turso production database.
 *
 * AUTHORIZED BY USER 2026-05-22 via AskUserQuestion ("Yes — run db push now")
 * after seeing the preview output from preview-thumbnail-migration.ts.
 *
 * Statements applied (additive only — no data is touched):
 *   ALTER TABLE Submission ADD COLUMN thumbnailPath TEXT;
 *   ALTER TABLE Submission ADD COLUMN thumbnailMimeType TEXT;
 *
 * Each statement is wrapped in a column-presence check so re-runs are safe.
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

  const ops: Array<{ name: string; sql: string }> = [
    {
      name: "thumbnailPath",
      sql: "ALTER TABLE Submission ADD COLUMN thumbnailPath TEXT",
    },
    {
      name: "thumbnailMimeType",
      sql: "ALTER TABLE Submission ADD COLUMN thumbnailMimeType TEXT",
    },
  ];

  let applied = 0;
  for (const op of ops) {
    if (existing.has(op.name)) {
      console.log(`SKIP ${op.name}: already exists`);
      continue;
    }
    console.log(`APPLY ${op.sql};`);
    await client.execute(op.sql);
    applied += 1;
  }

  console.log("\nVerifying...");
  const after = await client.execute("PRAGMA table_info(Submission)");
  const afterNames = new Set(after.rows.map((r) => String(r.name)));
  for (const op of ops) {
    if (!afterNames.has(op.name)) {
      throw new Error(`Verification failed: ${op.name} missing after migration`);
    }
    console.log(`OK ${op.name} present`);
  }

  console.log(`\nDone. ${applied} statement(s) applied.`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
