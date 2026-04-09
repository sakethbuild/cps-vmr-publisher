export const TEMPLATE_TYPE_OPTIONS = [
  "standard",
  "raphael_medina_subspecialty",
  "img_vmr",
  "sunday_fundamentals",
  "custom",
] as const;

export const SUBMISSION_STATUS_OPTIONS = [
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

export const PDF_ONLY_TEMPLATE_TYPES = [
  "standard",
  "raphael_medina_subspecialty",
  "img_vmr",
] as const;

export const SUNDAY_UPLOAD_EXTENSIONS = ["png", "jpg", "jpeg", "pdf"] as const;

export const ALLOWED_UPLOAD_LABELS: Record<string, string> = {
  standard: "PDF",
  raphael_medina_subspecialty: "PDF",
  img_vmr: "PDF",
  sunday_fundamentals: "PNG, JPG, or PDF (PDF will be auto-converted to image)",
  custom: "Optional PDF",
};

export const INTERNAL_DATE_LOCALE = "en-US";
