import type { Submission, SubmissionPerson } from "@prisma/client";

export type SubmissionWithPeople = Submission & {
  people: SubmissionPerson[];
};

export type WordPressDraftResult = {
  mode: "mock" | "real";
  pageId: string;
  url: string;
  primaryMediaUrl?: string | null;
  previewMediaUrl?: string | null;
};

export interface WordPressPublisher {
  createDraft(submission: SubmissionWithPeople): Promise<WordPressDraftResult>;
}
