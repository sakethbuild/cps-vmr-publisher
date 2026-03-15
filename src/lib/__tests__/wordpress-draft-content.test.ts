import { describe, expect, it } from "vitest";

import { buildWordPressDraftContent } from "../wordpress/draft-content";

const baseSubmission = {
  id: "submission-1",
  templateType: "standard" as const,
  title: "Virtual Morning Report - March 14, 2026",
  customTitle: null,
  subspecialty: null,
  residencyProgram: null,
  sessionDate: new Date("2026-03-14T12:00:00.000Z"),
  chiefComplaint: null,
  youtubeUrl: "https://youtube.com/watch?v=test",
  notes: "Ops note",
  status: "ready_for_draft" as const,
  originalFileName: "vmr.pdf",
  sanitizedFileName: "virtual-morning-report-march-14-2026.pdf",
  fileMimeType: "application/pdf",
  fileExtension: "pdf",
  storagePath: "submissions/submission-1/vmr.pdf",
  previewImagePath: null,
  previewImageMimeType: null,
  wordpressPageId: null,
  wordpressUrl: null,
  wordpressPrimaryMediaUrl: null,
  wordpressPreviewMediaUrl: null,
  wordpressPublishedAt: null,
  createdAt: new Date("2026-03-14T12:00:00.000Z"),
  updatedAt: new Date("2026-03-14T12:00:00.000Z"),
  people: [
    {
      id: "person-1",
      submissionId: "submission-1",
      role: "presenter" as const,
      fullName: "Dr. Maya Patel",
      linkType: "x" as const,
      handleOrUrl: "@mayapatel",
      normalizedUrl: "https://x.com/mayapatel",
      sortOrder: 0,
      createdAt: new Date("2026-03-14T12:00:00.000Z"),
      updatedAt: new Date("2026-03-14T12:00:00.000Z"),
    },
    {
      id: "person-2",
      submissionId: "submission-1",
      role: "discussant" as const,
      fullName: "Dr. Chris Ncube",
      linkType: "none" as const,
      handleOrUrl: null,
      normalizedUrl: null,
      sortOrder: 0,
      createdAt: new Date("2026-03-14T12:00:00.000Z"),
      updatedAt: new Date("2026-03-14T12:00:00.000Z"),
    },
  ],
};

describe("buildWordPressDraftContent", () => {
  it("builds placeholder content for standard submissions", () => {
    const content = buildWordPressDraftContent(baseSubmission, {
      primaryMediaUrl: "https://wordpress.local/media/vmr.pdf",
    });

    expect(content).toContain("VMR Draft Placeholder");
    expect(content).toContain("Case Presenter:");
    expect(content).toContain("https://wordpress.local/media/vmr.pdf");
  });

  it("builds image placeholder content for sunday fundamentals", () => {
    const content = buildWordPressDraftContent(
      {
        ...baseSubmission,
        templateType: "sunday_fundamentals",
        title: "Sunday Fundamentals VMR - March 14, 2026",
      },
      {
        previewMediaUrl: "https://wordpress.local/media/sunday.png",
      },
    );

    expect(content).toContain("Sunday Fundamentals Draft Placeholder");
    expect(content).toContain("Image-based layout");
    expect(content).toContain("https://wordpress.local/media/sunday.png");
  });
});
