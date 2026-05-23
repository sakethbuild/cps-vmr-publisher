/**
 * READ-ONLY preview of what the thumbnail migration would do.
 *
 * Queries the prod Turso DB to list the current columns of the Submission
 * table, then prints the ALTER TABLE statements that would run to bring it
 * into sync with the new schema. Does NOT execute any writes.
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

  console.log("Current Submission columns:");
  for (const r of cols.rows) {
    console.log(`  - ${r.name} ${r.type}${r.notnull ? " NOT NULL" : ""}`);
  }

  const wanted: Array<{ name: string; sql: string }> = [
    {
      name: "thumbnailPath",
      sql: "ALTER TABLE Submission ADD COLUMN thumbnailPath TEXT",
    },
    {
      name: "thumbnailMimeType",
      sql: "ALTER TABLE Submission ADD COLUMN thumbnailMimeType TEXT",
    },
  ];

  console.log("\nMigration plan:");
  let pending = 0;
  for (const w of wanted) {
    if (existing.has(w.name)) {
      console.log(`  - ${w.name}: already exists, no change`);
    } else {
      console.log(`  - ${w.name}: WOULD RUN: ${w.sql};`);
      pending += 1;
    }
  }

  console.log(`\nTotal statements to apply: ${pending}`);
  console.log("(This script did NOT run any of them. It only previews.)");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
