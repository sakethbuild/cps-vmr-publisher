import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return;
  const client = createClient({ url, authToken });
  const result = await client.execute(
    "SELECT id, slug, status, title, storagePath, fileExtension FROM Submission",
  );
  for (const row of result.rows) {
    console.log(`status=${row.status} slug=${row.slug} ext=${row.fileExtension}`);
    console.log(`  title: ${row.title}`);
    console.log(`  storage: ${(row.storagePath as string)?.slice(0, 80)}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
