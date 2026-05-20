import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStorageService } from "@/lib/storage";

export const runtime = "nodejs";

const ORPHAN_AGE_MS = 60 * 60 * 1000;

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  const vercelSignal = request.headers.get("x-vercel-cron");
  if (vercelSignal && process.env.VERCEL) return true;

  return false;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - ORPHAN_AGE_MS);

  const orphans = await prisma.submission.findMany({
    where: {
      status: "awaiting_upload",
      uploadConfirmedAt: null,
      createdAt: { lt: cutoff },
    },
    select: { id: true, storagePath: true },
  });

  const storage = getStorageService();
  let deleted = 0;
  let storageDeleted = 0;
  const errors: string[] = [];

  for (const orphan of orphans) {
    if (orphan.storagePath) {
      try {
        await storage.deleteFile(orphan.storagePath);
        storageDeleted += 1;
      } catch (error) {
        errors.push(
          `${orphan.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    await prisma.submission.delete({ where: { id: orphan.id } });
    deleted += 1;
  }

  return NextResponse.json({
    swept: deleted,
    storageDeleted,
    errors,
    cutoff: cutoff.toISOString(),
  });
}
