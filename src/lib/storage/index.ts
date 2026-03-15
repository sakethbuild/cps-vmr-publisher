import { LocalStorageService } from "@/lib/storage/local-storage-service";

export function getStorageService() {
  // TODO(storage): Swap this implementation for Vercel Blob or another provider
  // when the prototype is integrated into the main deployment environment.
  return new LocalStorageService();
}
