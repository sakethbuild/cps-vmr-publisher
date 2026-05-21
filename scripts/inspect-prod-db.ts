import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  console.log("=== Tables in production Turso ===");
  const tablesResult = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  for (const row of tablesResult.rows) {
    console.log(`  - ${row.name}`);
  }

  console.log("\n=== Submission row count ===");
  try {
    const subCount = await client.execute("SELECT COUNT(*) as c FROM Submission");
    console.log(`  rows: ${subCount.rows[0]?.c}`);
  } catch (error) {
    console.log(`  (Submission table missing or unreadable: ${error instanceof Error ? error.message : error})`);
  }

  console.log("\n=== Submissions with previewImagePath set (would be lost on drop) ===");
  try {
    const previewCount = await client.execute(
      "SELECT COUNT(*) as c FROM Submission WHERE previewImagePath IS NOT NULL",
    );
    console.log(`  rows: ${previewCount.rows[0]?.c}`);
  } catch (error) {
    console.log(`  (column previewImagePath does not exist — schema already PNG-only, or table missing)`);
  }

  console.log("\n=== Sample of first 3 Submission rows ===");
  try {
    const sample = await client.execute(
      "SELECT id, title, status, storagePath, fileExtension FROM Submission LIMIT 3",
    );
    for (const row of sample.rows) {
      console.log(`  ${row.id} | ${row.status} | ext=${row.fileExtension} | ${(row.title as string)?.slice(0, 60)}`);
    }
  } catch {
    // ignore if table missing
  }

  console.log("\n=== User table check ===");
  try {
    const userCount = await client.execute("SELECT COUNT(*) as c FROM User");
    console.log(`  User table exists. rows: ${userCount.rows[0]?.c}`);
  } catch {
    console.log(`  User table does NOT exist (expected — this branch adds it)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
