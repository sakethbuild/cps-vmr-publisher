import fs from "node:fs/promises";
import path from "node:path";

import { getEnv } from "@/lib/env";
import type {
  PresignedUploadParams,
  PresignedUploadResult,
  SaveFileInput,
  StorageService,
  StoredFile,
} from "@/lib/storage/storage-service";

export class LocalStorageService implements StorageService {
  private readonly root = getEnv().storageRoot;

  async ensureRoot(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async saveFile(input: SaveFileInput): Promise<StoredFile> {
    await this.ensureRoot();

    const relativePath = path.join(input.folder, input.fileName);
    const absolutePath = path.join(this.root, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.buffer);

    return {
      absolutePath,
      relativePath,
    };
  }

  async readFile(relativePath: string): Promise<Buffer> {
    return fs.readFile(path.join(this.root, relativePath));
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.root, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.root, relativePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }

  supportsPresignedUploads(): boolean {
    return false;
  }

  async createPresignedUpload(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params: PresignedUploadParams,
  ): Promise<PresignedUploadResult> {
    throw new Error(
      "LocalStorageService does not support presigned uploads. Configure R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL) for production direct uploads.",
    );
  }

  async readByteRange(
    relativePath: string,
    start: number,
    endInclusive: number,
  ): Promise<Buffer> {
    const handle = await fs.open(path.join(this.root, relativePath), "r");
    try {
      const length = endInclusive - start + 1;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, start);
      return buffer;
    } finally {
      await handle.close();
    }
  }

  async getContentLength(relativePath: string): Promise<number | null> {
    try {
      const stat = await fs.stat(path.join(this.root, relativePath));
      return stat.size;
    } catch {
      return null;
    }
  }
}
