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
  isAllowedUpload,
  requiresPrimaryUpload,
} from "@/lib/files";
import { normalizePersonUrl } from "@/lib/links";
import { convertFirstPdfPageToPng } from "@/lib/pdf";
import {
  calculateSubmissionStatus,
  hasRequiredSubmissionFields,
} from "@/lib/statuses";
import { getStorageService } from "@/lib/storage";
import { emptyPerson, type SubmissionFormState } from "@/lib/submission-form";
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

function parsePeople(rawValue: FormDataEntryValue | null): PersonInput[] {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return [];
  }

  const parsed = JSON.parse(rawValue) as PersonInput[];
  return parsed.map((person) => ({
    fullName: person.fullName ?? "",
    linkType: person.linkType ?? "none",
    handleOrUrl: person.handleOrUrl ?? "",
  }));
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

export async function storePrimaryUpload(params: {
  submissionId: string;
  templateType: TemplateType;
  sessionDate: string;
  file: File;
}) {
  const fileDetails = getFileDetails(params.file.name, params.file.type);

  if (!fileDetails.extension || !isAllowedUpload(params.templateType, fileDetails.extension)) {
    throw new Error("This file type is not allowed for the selected template.");
  }

  const sanitizedFileName = buildSanitizedFilename({
    templateType: params.templateType,
    sessionDate: params.sessionDate,
    extension: fileDetails.extension,
  });

  const storageService = getStorageService();
  const fileBuffer = Buffer.from(await params.file.arrayBuffer());
  const folder = `submissions/${params.submissionId}`;
  const storedFile = await storageService.saveFile({
    buffer: fileBuffer,
    fileName: sanitizedFileName,
    folder,
  });

  let previewImagePath: string | null = null;
  let previewImageMimeType: string | null = null;

  if (params.templateType === "sunday_fundamentals" && fileDetails.extension === "pdf") {
    const previewBuffer = await convertFirstPdfPageToPng(fileBuffer);
    const previewFileName = sanitizedFileName.replace(/\.pdf$/i, ".png");
    const previewImage = await storageService.saveFile({
      buffer: previewBuffer,
      fileName: previewFileName,
      folder,
    });
    previewImagePath = previewImage.relativePath;
    previewImageMimeType = "image/png";
  } else if (
    params.templateType === "sunday_fundamentals" &&
    ["png", "jpg", "jpeg"].includes(fileDetails.extension)
  ) {
    previewImagePath = storedFile.relativePath;
    previewImageMimeType = fileDetails.mimeType || `image/${fileDetails.extension}`;
  }

  return {
    originalFileName: params.file.name,
    sanitizedFileName,
    fileMimeType:
      fileDetails.mimeType ||
      (fileDetails.extension === "pdf"
        ? "application/pdf"
        : `image/${fileDetails.extension}`),
    fileExtension: fileDetails.extension,
    storagePath: storedFile.relativePath,
    previewImagePath,
    previewImageMimeType,
  };
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
  upload:
    | {
        originalFileName: string;
        sanitizedFileName: string;
        fileMimeType: string;
        fileExtension: string;
        storagePath: string;
        previewImagePath: string | null;
        previewImageMimeType: string | null;
      }
    | null;
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

  const status = calculateSubmissionStatus({
    templateType: params.input.templateType,
    sessionDate: params.input.sessionDate,
    subspecialty: params.input.subspecialty,
    residencyProgram: params.input.residencyProgram,
    customTitle: params.input.customTitle,
    hasUpload: Boolean(params.upload?.storagePath ?? params.existingSubmission?.storagePath),
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
  const storagePath =
    params.upload?.storagePath ?? params.existingSubmission?.storagePath;

  const previewImagePath =
    params.input.templateType === "sunday_fundamentals"
      ? params.upload?.previewImagePath ??
        params.existingSubmission?.previewImagePath ??
        null
      : null;
  const previewImageMimeType =
    params.input.templateType === "sunday_fundamentals"
      ? params.upload?.previewImageMimeType ??
        params.existingSubmission?.previewImageMimeType ??
        null
      : null;

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
      storagePath: storagePath ?? null,
      previewImagePath,
      previewImageMimeType,
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
