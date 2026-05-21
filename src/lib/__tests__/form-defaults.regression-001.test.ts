// Regression: ISSUE-001 — submit form defaulted to 2 discussant rows but 1 presenter,
// causing "Full name is required" on first submit when user only filled the first row.
// Found by /qa on 2026-05-21
// Report: .gstack/qa-reports/qa-report-cps-vmr-publisher-vercel-app-pdf-pipeline-2026-05-21.md

import { describe, expect, it } from "vitest";

import { createEmptySubmissionFormState } from "../submission-form";

describe("createEmptySubmissionFormState", () => {
  it("defaults to exactly 1 presenter and 1 discussant row (symmetric)", () => {
    const state = createEmptySubmissionFormState();
    expect(state.presenters).toHaveLength(1);
    expect(state.discussants).toHaveLength(1);
  });

  it("each default row is fully blank — fullName empty, linkType=none, handleOrUrl empty", () => {
    const state = createEmptySubmissionFormState();
    expect(state.presenters[0]).toEqual({
      fullName: "",
      linkType: "none",
      handleOrUrl: "",
    });
    expect(state.discussants[0]).toEqual({
      fullName: "",
      linkType: "none",
      handleOrUrl: "",
    });
  });

  it("respects passed templateType", () => {
    expect(createEmptySubmissionFormState("custom").templateType).toBe("custom");
    expect(createEmptySubmissionFormState("standard").templateType).toBe("standard");
  });
});
