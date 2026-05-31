/**
 * Backfill preview thumbnails for submissions that have a PDF but no thumbnail.
 *
 * Why this exists: the old client-side pdfjs render (F-022) silently failed for
 * most real uploads, so many submissions have a PDF in R2 but no thumbnailPath.
 * F-024 moved rendering server-side via mupdf. This applies that same mupdf
 * render to the existing backlog.
 *
 * For each submission with storagePath && !thumbnailPath:
 *   1. GET the PDF from R2
 *   2. render page 1 → PNG via mupdf (WASM)
 *   3. PUT the PNG to R2 at <pdf-key>.thumb.png
 *   4. UPDATE thumbnailPath + thumbnailMimeType
 *
 * Idempotent: re-running skips rows that already have a thumbnail. Best-effort
 * per row: a render failure logs and moves on (the PDF stays downloadable).
 *
 * Run: npx tsx --env-file=.env scripts/backfill-thumbnails.ts
 */

import "dotenv/config";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@libsql/client";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

function publicUrlToKey(publicUrl: string): string {
  if (publicUrl.startsWith(R2_PUBLIC_URL + "/")) {
    return publicUrl.slice(R2_PUBLIC_URL.length + 1);
  }
  return new URL(publicUrl).pathname.replace(/^\//, "");
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  const chunks: Buffer[] = [];
  // @ts-expect-error Node stream is async-iterable at runtime
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function renderFirstPagePng(pdfBytes: Buffer): Promise<Buffer> {
  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  try {
    if (doc.countPages() < 1) throw new Error("PDF has no pages");
    const page = doc.loadPage(0);
    const pixmap = page.toPixmap(
      mupdf.Matrix.scale(2, 2),
      mupdf.ColorSpace.DeviceRGB,
      false,
    );
    return Buffer.from(pixmap.asPNG());
  } finally {
    doc.destroy();
  }
}

async function main() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const res = await db.execute(
    "SELECT id, title, storagePath FROM Submission WHERE storagePath IS NOT NULL AND (thumbnailPath IS NULL OR thumbnailPath = '')",
  );
  console.log(`Found ${res.rows.length} submission(s) needing a thumbnail.\n`);

  let ok = 0;
  let failed = 0;
  for (const row of res.rows) {
    const id = String(row.id);
    const title = String(row.title).slice(0, 48);
    try {
      const pdfKey = publicUrlToKey(String(row.storagePath));
      const obj = await s3.send(
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: pdfKey }),
      );
      const pdfBytes = await streamToBuffer(obj.Body);
      const pngBytes = await renderFirstPagePng(pdfBytes);

      const thumbKey = pdfKey.replace(/\.pdf$/i, ".thumb.png");
      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: thumbKey,
          Body: pngBytes,
          ContentType: "image/png",
        }),
      );

      await db.execute({
        sql: "UPDATE Submission SET thumbnailPath = ?, thumbnailMimeType = ? WHERE id = ?",
        args: [`${R2_PUBLIC_URL}/${thumbKey}`, "image/png", id],
      });

      console.log(`OK   ${title} (${pngBytes.length} bytes)`);
      ok += 1;
    } catch (err) {
      console.warn(
        `FAIL ${title}: ${err instanceof Error ? err.message : String(err)}`,
      );
      failed += 1;
    }
  }

  console.log(`\nDone. ${ok} generated, ${failed} failed.`);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
