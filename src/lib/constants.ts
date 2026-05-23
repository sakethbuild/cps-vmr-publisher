export const TEMPLATE_TYPE_OPTIONS = [
  "standard",
  "raphael_medina_subspecialty",
  "img_vmr",
  "sunday_fundamentals",
  "custom",
] as const;

export const SUBMISSION_STATUS_OPTIONS = [
  "awaiting_upload",
  "submitted",
  "awaiting_youtube",
  "ready_to_publish",
  "published",
] as const;

export const PERSON_ROLE_OPTIONS = ["presenter", "discussant"] as const;

export const PERSON_LINK_TYPE_OPTIONS = [
  "none",
  "x",
  "instagram",
  "custom",
] as const;

// Upload is now PDF-only. The server generates a small PNG thumbnail for the
// archive card + public-page preview, but the canonical asset is the PDF.
export const ALLOWED_UPLOAD_EXTENSIONS = ["pdf"] as const;
export type AllowedUploadExtension = (typeof ALLOWED_UPLOAD_EXTENSIONS)[number];

export const UPLOAD_MIME_TYPES: Record<AllowedUploadExtension, string> = {
  pdf: "application/pdf",
};

// Thumbnail format — PNG, generated server-side from the first page of the PDF.
export const THUMBNAIL_MIME_TYPE = "image/png";
export const THUMBNAIL_EXTENSION = "png";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type TemplateUploadRule = {
  allowedExtensions: readonly AllowedUploadExtension[];
  label: string;
  required: boolean;
};

export const TEMPLATE_UPLOAD_RULES: Record<
  (typeof TEMPLATE_TYPE_OPTIONS)[number],
  TemplateUploadRule
> = {
  standard: {
    allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS,
    label: "PDF only",
    required: true,
  },
  raphael_medina_subspecialty: {
    allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS,
    label: "PDF only",
    required: true,
  },
  img_vmr: {
    allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS,
    label: "PDF only",
    required: true,
  },
  sunday_fundamentals: {
    allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS,
    label: "PDF only",
    required: true,
  },
  custom: {
    allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS,
    label: "Optional PDF",
    required: false,
  },
};

// NOTE on the "raphael" vs "Rafael" mismatch below:
// The presenter's actual name is "Rafael Medina" (one 'a', no 'ph'), so
// every user-visible string uses "Rafael". The internal schema key is
// `raphael_medina_subspecialty` — a typo from the original schema that
// already shipped to production. The key is opaque (never rendered to
// users; only used in DB enums, TypeScript switches, and zod). Renaming
// it would require a destructive Turso migration with no user benefit,
// so we leave the key and keep all labels/titles/error messages on the
// correct "Rafael" spelling. Same applies to templates.ts:23 and
// submission-types.ts:36.
export const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  raphael_medina_subspecialty: "Rafael Medina Subspecialty",
  img_vmr: "IMG VMR",
  sunday_fundamentals: "Sunday Fundamentals",
  custom: "Custom VMR",
};

export const INTERNAL_DATE_LOCALE = "en-US";
