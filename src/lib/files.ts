import path from "node:path";

import type { TemplateType } from "@prisma/client";

import {
  ALLOWED_IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  TEMPLATE_UPLOAD_RULES,
  type AllowedImageExtension,
} from "@/lib/constants";
import { formatDisplayDate } from "@/lib/dates";
import { getTemplateBaseSlug } from "@/lib/templates";

export type FileDetails = {
  extension: string;
  mimeType: string;
};

export function getFileDetails(filename: string, mimeType?: string | null): FileDetails {
  const extension = path.extname(filename).replace(".", "").toLowerCase();
  const normalizedMimeType = mimeType?.toLowerCase() ?? "";
  return {
    extension,
    mimeType: normalizedMimeType,
  };
}

export function isAllowedUpload(templateType: TemplateType, extension: string): boolean {
  const rule = TEMPLATE_UPLOAD_RULES[templateType];
  if (!rule) return false;
  return rule.allowedExtensions.includes(extension as AllowedImageExtension);
}

export function requiresPrimaryUpload(templateType: TemplateType): boolean {
  return TEMPLATE_UPLOAD_RULES[templateType]?.required ?? false;
}

export function mimeTypeForExtension(extension: string): string | null {
  const ext = extension.toLowerCase() as AllowedImageExtension;
  return IMAGE_MIME_TYPES[ext] ?? null;
}

export function isAllowedImageExtension(extension: string): extension is AllowedImageExtension {
  return ALLOWED_IMAGE_EXTENSIONS.includes(extension as AllowedImageExtension);
}

export function sanitizeSlugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildSanitizedFilename(params: {
  templateType: TemplateType;
  sessionDate: Date | string;
  extension: string;
}): string {
  const baseSlug = getTemplateBaseSlug(params.templateType);
  const dateSlug = sanitizeSlugPart(formatDisplayDate(params.sessionDate));
  return `${baseSlug}-${dateSlug}.${params.extension}`;
}
