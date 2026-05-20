import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { PrismaClient } from "@prisma/client";

async function convertFirstPdfPageToPng(buffer: Buffer): Promise<Buffer> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!("DOMMatrix" in g)) g.DOMMatrix = DOMMatrix;
  if (!("ImageData" in g)) g.ImageData = ImageData;
  if (!("Path2D" in g)) g.Path2D = Path2D;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
  });

  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  );
  const context = canvas.getContext("2d");

  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as never,
    viewport,
  }).promise;

  return Buffer.from(await canvas.encode("png"));
}

type MigrationResult =
  | { ok: true; submissionId: string; newStoragePath: string; sourceWas: "pdf" | "image" }
  | { ok: false; submissionId: string; reason: string };

async function downloadBytes(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download ${url}: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getR2Env() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      "Migration requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL.",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

function buildKey(submissionId: string, sanitizedFileName: string): string {
  return `submissions/${submissionId}/${sanitizedFileName}`;
}

async function migrateSubmission(params: {
  prisma: PrismaClient;
  s3: S3Client;
  bucket: string;
  publicUrl: string;
  submission: {
    id: string;
    storagePath: string | null;
    fileExtension: string | null;
    sanitizedFileName: string | null;
    fileMimeType: string | null;
  };
}): Promise<MigrationResult> {
  const { submission } = params;
  if (!submission.storagePath) {
    return { ok: false, submissionId: submission.id, reason: "no storagePath" };
  }

  if (
    submission.storagePath.startsWith(params.publicUrl) ||
    submission.storagePath.startsWith("https://") === false
  ) {
    return {
      ok: false,
      submissionId: submission.id,
      reason: "already on R2 or non-URL path",
    };
  }

  const sourceWas: "pdf" | "image" =
    submission.fileExtension === "pdf" ? "pdf" : "image";

  const sourceBytes = await downloadBytes(submission.storagePath);

  let outputBytes: Buffer;
  let outputMime: string;
  let outputExtension: string;
  let outputFileName: string;

  if (sourceWas === "pdf") {
    outputBytes = await convertFirstPdfPageToPng(sourceBytes);
    outputMime = "image/png";
    outputExtension = "png";
    const base =
      submission.sanitizedFileName?.replace(/\.pdf$/i, "") ?? `submission-${submission.id}`;
    outputFileName = `${base}.png`;
  } else {
    outputBytes = sourceBytes;
    outputMime = submission.fileMimeType ?? "image/png";
    outputExtension = submission.fileExtension ?? "png";
    outputFileName =
      submission.sanitizedFileName ?? `submission-${submission.id}.${outputExtension}`;
  }

  const key = buildKey(submission.id, outputFileName);
  await params.s3.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: key,
      Body: outputBytes,
      ContentType: outputMime,
    }),
  );

  const newStoragePath = `${params.publicUrl}/${key}`;
  await params.prisma.submission.update({
    where: { id: submission.id },
    data: {
      storagePath: newStoragePath,
      sanitizedFileName: outputFileName,
      fileExtension: outputExtension,
      fileMimeType: outputMime,
      uploadConfirmedAt: new Date(),
    },
  });

  return { ok: true, submissionId: submission.id, newStoragePath, sourceWas };
}

async function main() {
  const env = getR2Env();
  const prisma = new PrismaClient();
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });

  const submissions = await prisma.submission.findMany({
    where: { storagePath: { not: null } },
    select: {
      id: true,
      storagePath: true,
      fileExtension: true,
      sanitizedFileName: true,
      fileMimeType: true,
    },
  });

  console.log(`Found ${submissions.length} submissions with storagePath.`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const submission of submissions) {
    try {
      const result = await migrateSubmission({
        prisma,
        s3,
        bucket: env.bucket,
        publicUrl: env.publicUrl.replace(/\/$/, ""),
        submission,
      });
      if (result.ok) {
        migrated += 1;
        console.log(
          `  [${submission.id}] migrated (${result.sourceWas}) -> ${result.newStoragePath}`,
        );
      } else {
        skipped += 1;
        console.log(`  [${submission.id}] skipped: ${result.reason}`);
      }
    } catch (error) {
      failed += 1;
      console.error(
        `  [${submission.id}] failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(`\nMigration complete. migrated=${migrated} skipped=${skipped} failed=${failed}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
