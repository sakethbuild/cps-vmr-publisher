import type { SubmissionStatus, TemplateType } from "@prisma/client";

import { TEMPLATE_UPLOAD_RULES } from "@/lib/constants";

const YOUTUBE_REQUIRED_TYPES: TemplateType[] = [
  "standard",
  "raphael_medina_subspecialty",
  "img_vmr",
  "simplicity_in_complexity_vmr",
  "academy_session",
  "mainstream_mondays",
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

  if (params.templateType === "custom") {
    return Boolean(params.customTitle?.trim());
  }

  // Templates with an optional PDF (e.g. academy_session) only need a session
  // date; everything else needs the upload too. Drive this off the upload
  // rules so the two stay in sync.
  if (!TEMPLATE_UPLOAD_RULES[params.templateType]?.required) {
    return true;
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

function requiresUpload(templateType: TemplateType): boolean {
  // Single source of truth: a template requires an upload iff its upload rule
  // says so (custom + academy_session are optional).
  return Boolean(TEMPLATE_UPLOAD_RULES[templateType]?.required);
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
  if (requiresUpload(params.templateType) && !params.hasUpload) {
    return "awaiting_upload";
  }

  if (!hasRequiredSubmissionFields(params)) {
    return "submitted";
  }

  if (requiresYoutubeUrl(params.templateType) && !params.youtubeUrl?.trim()) {
    return "awaiting_youtube";
  }

  return canBecomeReady(params) ? "ready_to_publish" : "submitted";
}
