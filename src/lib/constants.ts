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

export const ALLOWED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"] as const;
export type AllowedImageExtension = (typeof ALLOWED_IMAGE_EXTENSIONS)[number];

export const IMAGE_MIME_TYPES: Record<AllowedImageExtension, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type TemplateUploadRule = {
  allowedExtensions: readonly AllowedImageExtension[];
  label: string;
  required: boolean;
};

export const TEMPLATE_UPLOAD_RULES: Record<
  (typeof TEMPLATE_TYPE_OPTIONS)[number],
  TemplateUploadRule
> = {
  standard: {
    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
    label: "PNG or JPG",
    required: true,
  },
  raphael_medina_subspecialty: {
    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
    label: "PNG or JPG",
    required: true,
  },
  img_vmr: {
    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
    label: "PNG or JPG",
    required: true,
  },
  sunday_fundamentals: {
    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
    label: "PNG or JPG",
    required: true,
  },
  custom: {
    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
    label: "Optional PNG or JPG",
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
