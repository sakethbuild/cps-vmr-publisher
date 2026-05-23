import "server-only";

import type { TemplateType } from "@prisma/client";

import { MAX_UPLOAD_BYTES, THUMBNAIL_MIME_TYPE } from "@/lib/constants";
import {
  buildSanitizedFilename,
  getFileDetails,
  isAllowedUpload,
  isAllowedUploadExtension,
  mimeTypeForExtension,
} from "@/lib/files";
import { getStorageService } from "@/lib/storage";
import type { PresignedUploadResult } from "@/lib/storage/storage-service";

export type PresignedUploadResponse = PresignedUploadResult & {
  sanitizedFileName: string;
  fileExtension: string;
  fileMimeType: string;
  // Optional second presigned URL for the auto-generated PNG thumbnail.
  // Returned alongside the PDF presign so the client can upload both
  // files in parallel.
  thumbnailUpload?: {
    uploadUrl: string;
    publicUrl: string;
    storageKey: string;
    sanitizedFileName: string;
    contentType: string;
  };
};

export async function createPresignedUploadForSubmission(params: {
  submissionId: string;
  templateType: TemplateType;
  sessionDate: string;
  originalFileName: string;
  declaredMimeType: string | null;
}): Promise<PresignedUploadResponse> {
  const details = getFileDetails(params.originalFileName, params.declaredMimeType);

  if (!details.extension || !isAllowedUploadExtension(details.extension)) {
    throw new Error("Only PDF files are allowed for VMR uploads.");
  }

  if (!isAllowedUpload(params.templateType, details.extension)) {
    throw new Error("This file type is not allowed for the selected template.");
  }

  const sanitized = buildSanitizedFilename({
    templateType: params.templateType,
    sessionDate: params.sessionDate,
    extension: details.extension,
  });

  const mimeType =
    mimeTypeForExtension(details.extension) ??
    details.mimeType ??
    "application/octet-stream";

  const storage = getStorageService();
  if (!storage.supportsPresignedUploads()) {
    throw new Error(
      "Storage backend does not support presigned uploads. R2 must be configured.",
    );
  }

  const folder = `submissions/${params.submissionId}`;
  const presigned = await storage.createPresignedUpload({
    folder,
    fileName: sanitized,
    contentType: mimeType,
    maxBytes: MAX_UPLOAD_BYTES,
  });

  // Sibling thumbnail upload: same folder, same base filename, .thumb.png.
  // The client renders the first page of the PDF to PNG before upload,
  // so the server never has to do CPU-heavy PDF work.
  const thumbnailFileName = sanitized.replace(/\.pdf$/i, ".thumb.png");
  const thumbnailPresigned = await storage.createPresignedUpload({
    folder,
    fileName: thumbnailFileName,
    contentType: THUMBNAIL_MIME_TYPE,
    maxBytes: MAX_UPLOAD_BYTES,
  });

  return {
    ...presigned,
    sanitizedFileName: sanitized,
    fileExtension: details.extension,
    fileMimeType: mimeType,
    thumbnailUpload: {
      uploadUrl: thumbnailPresigned.uploadUrl,
      publicUrl: thumbnailPresigned.publicUrl,
      storageKey: thumbnailPresigned.storageKey,
      sanitizedFileName: thumbnailFileName,
      contentType: THUMBNAIL_MIME_TYPE,
    },
  };
}
