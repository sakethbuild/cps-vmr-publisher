import "server-only";

import { randomUUID } from "node:crypto";

import type {
  PersonLinkType,
  PersonRole,
  Prisma,
  Submission,
  SubmissionPerson,
  SubmissionStatus,
  TemplateType,
} from "@prisma/client";

import { parseSessionDateInput } from "@/lib/dates";
import {
  buildSanitizedFilename,
  getFileDetails,
  isAllowedImageExtension,
  isAllowedUpload,
  mimeTypeForExtension,
  requiresPrimaryUpload,
} from "@/lib/files";
import { normalizePersonUrl } from "@/lib/links";
import {
  calculateSubmissionStatus,
  hasRequiredSubmissionFields,
} from "@/lib/statuses";
import {
  emptyPerson,
  type SubmissionFormState,
} from "@/lib/submission-form";
import {
  submissionSchema,
  type PersonInput,
  type SubmissionFormInput,
} from "@/lib/submission-types";
import { generateSubmissionTitle } from "@/lib/templates";

function normalizeOptional(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function isPersonRowBlank(person: PersonInput): boolean {
  return !person.fullName?.trim() && !person.handleOrUrl?.trim();
}

function parsePeople(rawValue: FormDataEntryValue | null): PersonInput[] {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return [];
  }

  const parsed = JSON.parse(rawValue) as PersonInput[];
  return parsed
    .map((person) => ({
      fullName: person.fullName ?? "",
      linkType: person.linkType ?? "none",
      handleOrUrl: person.handleOrUrl ?? "",
    }))
    .filter((person) => !isPersonRowBlank(person));
}

export function parseSubmissionFormData(
  formData: FormData,
): SubmissionFormInput {
  const result = submissionSchema.safeParse({
    templateType: formData.get("templateType"),
    subspecialty: normalizeOptional(formData.get("subspecialty") as string | null),
    residencyProgram: normalizeOptional(
      formData.get("residencyProgram") as string | null,
    ),
    customTitle: normalizeOptional(formData.get("customTitle") as string | null),
    sessionDate: formData.get("sessionDate"),
    chiefComplaint: formData.get("chiefComplaint"),
    youtubeUrl: normalizeOptional(formData.get("youtubeUrl") as string | null),
    notes: normalizeOptional(formData.get("notes") as string | null),
    presenters: parsePeople(formData.get("presenters")),
    discussants: parsePeople(formData.get("discussants")),
  });

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid submission data.");
  }

  return result.data;
}

export type UploadDescriptor = {
  originalFileName: string;
  sanitizedFileName: string;
  fileMimeType: string;
  fileExtension: string;
  storagePath: string;
};

export function buildUploadDescriptor(params: {
  templateType: TemplateType;
  sessionDate: string;
  originalFileName: string;
  declaredMimeType: string | null;
}): { sanitized: string; extension: string; mimeType: string } {
  const fileDetails = getFileDetails(params.originalFileName, params.declaredMimeType);

  if (!fileDetails.extension || !isAllowedImageExtension(fileDetails.extension)) {
    throw new Error("Only PNG or JPG images are allowed for VMR uploads.");
  }

  if (!isAllowedUpload(params.templateType, fileDetails.extension)) {
    throw new Error("This file type is not allowed for the selected template.");
  }

  const sanitized = buildSanitizedFilename({
    templateType: params.templateType,
    sessionDate: params.sessionDate,
    extension: fileDetails.extension,
  });

  const mimeType =
    mimeTypeForExtension(fileDetails.extension) ??
    fileDetails.mimeType ??
    "application/octet-stream";

  return { sanitized, extension: fileDetails.extension, mimeType };
}

export function validateUploadRequirement(params: {
  templateType: TemplateType;
  hasIncomingUpload: boolean;
  hasExistingUpload: boolean;
}) {
  if (
    requiresPrimaryUpload(params.templateType) &&
    !params.hasIncomingUpload &&
    !params.hasExistingUpload
  ) {
    throw new Error("An upload is required for this template.");
  }
}

export function createPeopleData(
  presenters: PersonInput[],
  discussants: PersonInput[],
) {
  const buildRoleRecords = (role: PersonRole, people: PersonInput[]) =>
    people.map((person, index) => ({
      id: randomUUID(),
      role,
      fullName: person.fullName.trim(),
      linkType: person.linkType as PersonLinkType,
      handleOrUrl: normalizeOptional(person.handleOrUrl ?? ""),
      normalizedUrl: normalizePersonUrl(
        person.linkType as PersonLinkType,
        person.handleOrUrl,
      ),
      sortOrder: index,
    }));

  return [
    ...buildRoleRecords("presenter", presenters),
    ...buildRoleRecords("discussant", discussants),
  ];
}

export function buildSubmissionPayload(params: {
  input: SubmissionFormInput;
  upload: UploadDescriptor | null;
  existingSubmission?: Submission | null;
}): {
  title: string;
  status: SubmissionStatus;
  data: Omit<Prisma.SubmissionCreateInput, "people">;
} {
  const sessionDate = parseSessionDateInput(params.input.sessionDate);
  const title = generateSubmissionTitle({
    templateType: params.input.templateType,
    sessionDate,
    subspecialty: params.input.subspecialty,
    residencyProgram: params.input.residencyProgram,
    customTitle: params.input.customTitle,
    chiefComplaint: params.input.chiefComplaint,
  });

  const storagePath =
    params.upload?.storagePath ?? params.existingSubmission?.storagePath ?? null;

  const status = calculateSubmissionStatus({
    templateType: params.input.templateType,
    sessionDate: params.input.sessionDate,
    subspecialty: params.input.subspecialty,
    residencyProgram: params.input.residencyProgram,
    customTitle: params.input.customTitle,
    hasUpload: Boolean(storagePath),
    youtubeUrl: params.input.youtubeUrl,
  });

  const originalFileName =
    params.upload?.originalFileName ?? params.existingSubmission?.originalFileName;
  const sanitizedFileName =
    params.upload?.sanitizedFileName ?? params.existingSubmission?.sanitizedFileName;
  const fileMimeType =
    params.upload?.fileMimeType ?? params.existingSubmission?.fileMimeType;
  const fileExtension =
    params.upload?.fileExtension ?? params.existingSubmission?.fileExtension;

  return {
    title,
    status,
    data: {
      templateType: params.input.templateType,
      title,
      customTitle: params.input.customTitle ?? null,
      subspecialty: params.input.subspecialty ?? null,
      residencyProgram: params.input.residencyProgram ?? null,
      sessionDate,
      chiefComplaint: params.input.chiefComplaint,
      youtubeUrl: params.input.youtubeUrl ?? null,
      notes: params.input.notes ?? null,
      status,
      originalFileName: originalFileName ?? null,
      sanitizedFileName: sanitizedFileName ?? null,
      fileMimeType: fileMimeType ?? null,
      fileExtension: fileExtension ?? null,
      storagePath,
    },
  };
}

export function determineStatusForExistingSubmission(
  submission: Submission,
  overrides?: {
    youtubeUrl?: string | null;
  },
) {
  return calculateSubmissionStatus({
    templateType: submission.templateType,
    sessionDate: submission.sessionDate,
    subspecialty: submission.subspecialty,
    residencyProgram: submission.residencyProgram,
    customTitle: submission.customTitle,
    hasUpload: Boolean(submission.storagePath),
    youtubeUrl: overrides?.youtubeUrl ?? submission.youtubeUrl,
  });
}

export function submissionMeetsRequiredFields(submission: Submission) {
  return hasRequiredSubmissionFields({
    templateType: submission.templateType,
    sessionDate: submission.sessionDate,
    subspecialty: submission.subspecialty,
    residencyProgram: submission.residencyProgram,
    customTitle: submission.customTitle,
    hasUpload: Boolean(submission.storagePath),
  });
}

export function toFormState(
  submission: Submission & { people: SubmissionPerson[] },
): SubmissionFormState {
  const presenters = submission.people
    .filter((person) => person.role === "presenter")
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((person) => ({
      fullName: person.fullName,
      linkType: person.linkType,
      handleOrUrl: person.handleOrUrl ?? "",
    }));

  const discussants = submission.people
    .filter((person) => person.role === "discussant")
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((person) => ({
      fullName: person.fullName,
      linkType: person.linkType,
      handleOrUrl: person.handleOrUrl ?? "",
    }));

  return {
    id: submission.id,
    templateType: submission.templateType,
    subspecialty: submission.subspecialty ?? "",
    residencyProgram: submission.residencyProgram ?? "",
    customTitle: submission.customTitle ?? "",
    sessionDate: submission.sessionDate.toISOString().slice(0, 10),
    chiefComplaint: submission.chiefComplaint ?? "",
    youtubeUrl: submission.youtubeUrl ?? "",
    notes: submission.notes ?? "",
    presenters: presenters.length ? presenters : [emptyPerson()],
    discussants: discussants.length ? discussants : [emptyPerson()],
    currentStatus: submission.status,
    existingFileName: submission.originalFileName,
  };
}
