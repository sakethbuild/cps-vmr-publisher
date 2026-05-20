export type SaveFileInput = {
  buffer: Buffer;
  fileName: string;
  folder: string;
  contentType?: string;
};

export type StoredFile = {
  absolutePath: string;
  relativePath: string;
};

export type PresignedUploadParams = {
  folder: string;
  fileName: string;
  contentType: string;
  maxBytes: number;
};

export type PresignedUploadResult = {
  uploadUrl: string;
  publicUrl: string;
  storageKey: string;
  expiresInSeconds: number;
};

export interface StorageService {
  ensureRoot(): Promise<void>;
  saveFile(input: SaveFileInput): Promise<StoredFile>;
  readFile(relativePath: string): Promise<Buffer>;
  fileExists(relativePath: string): Promise<boolean>;
  deleteFile(relativePath: string): Promise<void>;

  supportsPresignedUploads(): boolean;
  createPresignedUpload(params: PresignedUploadParams): Promise<PresignedUploadResult>;

  readByteRange(relativePath: string, start: number, endInclusive: number): Promise<Buffer>;
  getContentLength(relativePath: string): Promise<number | null>;
}
