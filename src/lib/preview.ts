import type {
  PersonLinkType,
  PersonRole,
  Submission,
  SubmissionPerson,
  TemplateType,
} from "@prisma/client";

import { normalizePersonUrl } from "@/lib/links";

type PreviewPersonInput = {
  fullName: string;
  linkType: PersonLinkType;
  handleOrUrl?: string | null;
  normalizedUrl?: string | null;
};

export type LinkedPerson = {
  fullName: string;
  url: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildLinkedPeople(
  people: PreviewPersonInput[],
): LinkedPerson[] {
  return people
    .filter((person) => person.fullName.trim())
    .map((person) => ({
      fullName: person.fullName.trim(),
      url:
        person.normalizedUrl ??
        normalizePersonUrl(person.linkType, person.handleOrUrl ?? undefined),
    }));
}

export function renderLinkedPeopleText(people: LinkedPerson[]): string {
  if (!people.length) {
    return "";
  }

  return people.map((person) => person.fullName).join(", ");
}

export function renderLinkedPeopleHtml(people: LinkedPerson[]): string {
  if (!people.length) {
    return "";
  }

  return people
    .map((person) =>
      person.url
        ? `<a href="${escapeHtml(person.url)}">${escapeHtml(person.fullName)}</a>`
        : escapeHtml(person.fullName),
    )
    .join(", ");
}

export function filterPeopleByRole(
  people: SubmissionPerson[],
  role: PersonRole,
): LinkedPerson[] {
  return buildLinkedPeople(
    people
      .filter((person) => person.role === role)
      .sort((left, right) => left.sortOrder - right.sortOrder),
  );
}

export function isStandardPreview(templateType: TemplateType) {
  return [
    "standard",
    "raphael_medina_subspecialty",
    "img_vmr",
  ].includes(templateType);
}

export function buildSubmissionPreviewModel(
  submission: Submission & { people: SubmissionPerson[] },
) {
  return {
    presenters: filterPeopleByRole(submission.people, "presenter"),
    discussants: filterPeopleByRole(submission.people, "discussant"),
    isStandardPreview: isStandardPreview(submission.templateType),
    isSundayPreview: submission.templateType === "sunday_fundamentals",
    isCustomPreview: submission.templateType === "custom",
  };
}
