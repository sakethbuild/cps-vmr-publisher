import type { SubmissionStatus, TemplateType } from "@prisma/client";

const YOUTUBE_REQUIRED_TYPES: TemplateType[] = [
  "standard",
  "raphael_medina_subspecialty",
  "img_vmr",
];

export function requiresYoutubeUrl(templateType: TemplateType): boolean {
  return YOUTUBE_REQUIRED_TYPES.includes(templateType);
}

export function hasRequiredSubmissionFields(params: {
  templateType: TemplateType;
  sessionDate?: string | Date | null;
  subspecialty?: string | null;
  residencyProgram?: string | null;
  customTitle?: string | null;
  hasUpload?: boolean;
}): boolean {
  if (!params.sessionDate) {
    return false;
  }

  if (params.templateType === "raphael_medina_subspecialty") {
    return Boolean(params.subspecialty?.trim()) && Boolean(params.hasUpload);
  }

  if (params.templateType === "img_vmr") {
    return Boolean(params.residencyProgram?.trim()) && Boolean(params.hasUpload);
  }

  if (params.templateType === "sunday_fundamentals") {
    return Boolean(params.hasUpload);
  }

  if (params.templateType === "custom") {
    return Boolean(params.customTitle?.trim());
  }

  return Boolean(params.hasUpload);
}

export function canBecomeReady(params: {
  templateType: TemplateType;
  sessionDate?: string | Date | null;
  subspecialty?: string | null;
  residencyProgram?: string | null;
  customTitle?: string | null;
  hasUpload?: boolean;
  youtubeUrl?: string | null;
}): boolean {
  if (!hasRequiredSubmissionFields(params)) {
    return false;
  }

  return requiresYoutubeUrl(params.templateType)
    ? Boolean(params.youtubeUrl?.trim())
    : true;
}

export function calculateSubmissionStatus(params: {
  templateType: TemplateType;
  sessionDate?: string | Date | null;
  subspecialty?: string | null;
  residencyProgram?: string | null;
  customTitle?: string | null;
  hasUpload?: boolean;
  youtubeUrl?: string | null;
}): SubmissionStatus {
  if (!hasRequiredSubmissionFields(params)) {
    return "submitted";
  }

  if (requiresYoutubeUrl(params.templateType) && !params.youtubeUrl?.trim()) {
    return "awaiting_youtube";
  }

  return canBecomeReady(params) ? "ready_to_publish" : "submitted";
}
