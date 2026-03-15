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

  if (params.templateType === "sunday_fundamentals") {
    return true;
  }

  if (params.templateType === "custom") {
    return false;
  }

  return Boolean(params.youtubeUrl?.trim());
}

export function calculateSubmissionStatus(params: {
  templateType: TemplateType;
  sessionDate?: string | Date | null;
  subspecialty?: string | null;
  residencyProgram?: string | null;
  customTitle?: string | null;
  hasUpload?: boolean;
  youtubeUrl?: string | null;
  manualStatus?: SubmissionStatus | null;
}): SubmissionStatus {
  if (params.manualStatus) {
    if (params.manualStatus === "ready_for_draft") {
      if (params.templateType === "custom") {
        return "ready_for_draft";
      }

      if (canBecomeReady(params)) {
        return "ready_for_draft";
      }

      return requiresYoutubeUrl(params.templateType)
        ? "awaiting_youtube"
        : "ready_for_draft";
    }

    return params.manualStatus;
  }

  if (params.templateType === "custom") {
    return "submitted";
  }

  if (params.templateType === "sunday_fundamentals") {
    return "ready_for_draft";
  }

  return canBecomeReady(params) ? "ready_for_draft" : "awaiting_youtube";
}
