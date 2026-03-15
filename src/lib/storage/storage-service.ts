export type SaveFileInput = {
  buffer: Buffer;
  fileName: string;
  folder: string;
};

export type StoredFile = {
  absolutePath: string;
  relativePath: string;
};

export interface StorageService {
  ensureRoot(): Promise<void>;
  saveFile(input: SaveFileInput): Promise<StoredFile>;
  readFile(relativePath: string): Promise<Buffer>;
  fileExists(relativePath: string): Promise<boolean>;
}
