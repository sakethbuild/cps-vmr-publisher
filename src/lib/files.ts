import path from "node:path";

import type { TemplateType } from "@prisma/client";

import {
  PDF_ONLY_TEMPLATE_TYPES,
  SUNDAY_UPLOAD_EXTENSIONS,
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
  if (templateType === "sunday_fundamentals") {
    return SUNDAY_UPLOAD_EXTENSIONS.includes(
      extension as (typeof SUNDAY_UPLOAD_EXTENSIONS)[number],
    );
  }

  if (templateType === "custom") {
    return extension === "pdf";
  }

  return PDF_ONLY_TEMPLATE_TYPES.includes(
    templateType as (typeof PDF_ONLY_TEMPLATE_TYPES)[number],
  )
    ? extension === "pdf"
    : false;
}

export function requiresPrimaryUpload(templateType: TemplateType): boolean {
  return templateType !== "custom";
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
