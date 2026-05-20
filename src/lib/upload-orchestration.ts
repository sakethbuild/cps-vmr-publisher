import "server-only";

import type { TemplateType } from "@prisma/client";

import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import {
  buildSanitizedFilename,
  getFileDetails,
  isAllowedImageExtension,
  isAllowedUpload,
  mimeTypeForExtension,
} from "@/lib/files";
import { getStorageService } from "@/lib/storage";
import type { PresignedUploadResult } from "@/lib/storage/storage-service";

export type PresignedUploadResponse = PresignedUploadResult & {
  sanitizedFileName: string;
  fileExtension: string;
  fileMimeType: string;
};

export async function createPresignedUploadForSubmission(params: {
  submissionId: string;
  templateType: TemplateType;
  sessionDate: string;
  originalFileName: string;
  declaredMimeType: string | null;
}): Promise<PresignedUploadResponse> {
  const details = getFileDetails(params.originalFileName, params.declaredMimeType);

  if (!details.extension || !isAllowedImageExtension(details.extension)) {
    throw new Error("Only PNG or JPG images are allowed.");
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

  const presigned = await storage.createPresignedUpload({
    folder: `submissions/${params.submissionId}`,
    fileName: sanitized,
    contentType: mimeType,
    maxBytes: MAX_UPLOAD_BYTES,
  });

  return {
    ...presigned,
    sanitizedFileName: sanitized,
    fileExtension: details.extension,
    fileMimeType: mimeType,
  };
}
