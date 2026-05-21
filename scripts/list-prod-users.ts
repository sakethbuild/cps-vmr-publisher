// Read-only: list users in production Turso so we can show the real state.
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
    "SELECT email, role, createdAt FROM User ORDER BY createdAt",
  );
  for (const row of result.rows) {
    console.log(`${row.email} | ${row.role} | created ${row.createdAt}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
