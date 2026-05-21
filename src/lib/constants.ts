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

// Final-form image extensions stored in R2 (PDFs get converted to PNG on confirm).
export const ALLOWED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"] as const;
export type AllowedImageExtension = (typeof ALLOWED_IMAGE_EXTENSIONS)[number];

// Extensions the client is allowed to UPLOAD. PDFs get auto-converted to PNG
// server-side in the confirm-upload route.
export const ALLOWED_UPLOAD_EXTENSIONS = ["png", "jpg", "jpeg", "pdf"] as const;
export type AllowedUploadExtension = (typeof ALLOWED_UPLOAD_EXTENSIONS)[number];

export const UPLOAD_MIME_TYPES: Record<AllowedUploadExtension, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
};

// Subset of UPLOAD_MIME_TYPES, kept for callers that only need the image forms.
export const IMAGE_MIME_TYPES: Record<AllowedImageExtension, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

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
    label: "PNG, JPG, or PDF (PDFs auto-convert to images)",
    required: true,
  },
  raphael_medina_subspecialty: {
    allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS,
    label: "PNG, JPG, or PDF (PDFs auto-convert to images)",
    required: true,
  },
  img_vmr: {
    allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS,
    label: "PNG, JPG, or PDF (PDFs auto-convert to images)",
    required: true,
  },
  sunday_fundamentals: {
    allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS,
    label: "PNG, JPG, or PDF (PDFs auto-convert to images)",
    required: true,
  },
  custom: {
    allowedExtensions: ALLOWED_UPLOAD_EXTENSIONS,
    label: "Optional PNG, JPG, or PDF",
    required: false,
  },
};

export const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  raphael_medina_subspecialty: "Rafael Medina Subspecialty",
  img_vmr: "IMG VMR",
  sunday_fundamentals: "Sunday Fundamentals",
  custom: "Custom VMR",
};

export const INTERNAL_DATE_LOCALE = "en-US";
