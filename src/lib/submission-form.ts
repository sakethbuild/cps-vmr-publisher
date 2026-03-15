import type { SubmissionStatus, TemplateType } from "@prisma/client";

import type { PersonInput, SubmissionFormInput } from "@/lib/submission-types";

export type SubmissionFormState = SubmissionFormInput & {
  id?: string;
  existingFileName?: string | null;
  manualStatus?: SubmissionStatus;
};

export function emptyPerson(): PersonInput {
  return {
    fullName: "",
    linkType: "none",
    handleOrUrl: "",
  };
}

export function createEmptySubmissionFormState(
  templateType: TemplateType = "standard",
): SubmissionFormState {
  return {
    templateType,
    subspecialty: "",
    residencyProgram: "",
    customTitle: "",
    sessionDate: "",
    chiefComplaint: "",
    youtubeUrl: "",
    notes: "",
    presenters: [emptyPerson()],
    discussants: [emptyPerson()],
  };
}
