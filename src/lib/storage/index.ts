import { LocalStorageService } from "@/lib/storage/local-storage-service";
import { R2StorageService } from "@/lib/storage/r2-storage-service";
import type { StorageService } from "@/lib/storage/storage-service";

let cachedService: StorageService | null = null;

function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL,
  );
}

export function getStorageService(): StorageService {
  if (cachedService) return cachedService;

  if (isR2Configured()) {
    cachedService = new R2StorageService();
    return cachedService;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL in this deployment's environment.",
    );
  }

  cachedService = new LocalStorageService();
  return cachedService;
}
