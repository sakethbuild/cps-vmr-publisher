import fs from "node:fs/promises";
import path from "node:path";

import { getEnv } from "@/lib/env";
import type { SaveFileInput, StorageService, StoredFile } from "@/lib/storage/storage-service";

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
}
