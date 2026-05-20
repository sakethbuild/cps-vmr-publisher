import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  PresignedUploadParams,
  PresignedUploadResult,
  SaveFileInput,
  StorageService,
  StoredFile,
} from "@/lib/storage/storage-service";

const PRESIGNED_URL_TTL_SECONDS = 5 * 60;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      "R2 not configured. Required env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.",
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export class R2StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const config = getR2Config();
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl.replace(/\/$/, "");
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private buildKey(folder: string, fileName: string): string {
    return `${folder.replace(/^\/+|\/+$/g, "")}/${fileName}`;
  }

  private publicUrlForKey(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  private keyFromPublicUrl(relativePath: string): string {
    if (relativePath.startsWith(this.publicUrl + "/")) {
      return relativePath.slice(this.publicUrl.length + 1);
    }
    return relativePath;
  }

  async ensureRoot(): Promise<void> {
    // No-op: R2 has no directory concept
  }

  async saveFile(input: SaveFileInput): Promise<StoredFile> {
    const key = this.buildKey(input.folder, input.fileName);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );

    const publicUrl = this.publicUrlForKey(key);
    return {
      absolutePath: publicUrl,
      relativePath: publicUrl,
    };
  }

  async readFile(relativePath: string): Promise<Buffer> {
    const key = this.keyFromPublicUrl(relativePath);
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error(`R2 object missing body: ${key}`);
    }
    const chunks: Buffer[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const key = this.keyFromPublicUrl(relativePath);
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    const key = this.keyFromPublicUrl(relativePath);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  supportsPresignedUploads(): boolean {
    return true;
  }

  async createPresignedUpload(
    params: PresignedUploadParams,
  ): Promise<PresignedUploadResult> {
    const key = this.buildKey(params.folder, params.fileName);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });

    return {
      uploadUrl,
      publicUrl: this.publicUrlForKey(key),
      storageKey: key,
      expiresInSeconds: PRESIGNED_URL_TTL_SECONDS,
    };
  }

  async readByteRange(
    relativePath: string,
    start: number,
    endInclusive: number,
  ): Promise<Buffer> {
    const key = this.keyFromPublicUrl(relativePath);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Range: `bytes=${start}-${endInclusive}`,
      }),
    );
    if (!response.Body) {
      throw new Error(`R2 object missing body on range request: ${key}`);
    }
    const chunks: Buffer[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getContentLength(relativePath: string): Promise<number | null> {
    const key = this.keyFromPublicUrl(relativePath);
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return response.ContentLength ?? null;
    } catch {
      return null;
    }
  }
}
