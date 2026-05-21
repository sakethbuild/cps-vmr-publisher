// Read-only: lists published submission IDs from production Turso so we can
// diagnose the delete failure on a specific id.
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("Missing TURSO env vars");
    process.exit(1);
  }
  const client = createClient({ url, authToken });
  const result = await client.execute(
    "SELECT id, title, status, storagePath FROM Submission WHERE status = 'published' LIMIT 3",
  );
  for (const row of result.rows) {
    console.log(`${row.id} | ${row.status} | storagePath=${(row.storagePath as string)?.slice(0, 60)} | ${(row.title as string)?.slice(0, 50)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
