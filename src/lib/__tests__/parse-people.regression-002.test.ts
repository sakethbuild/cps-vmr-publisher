// Regression: ISSUE-002 — empty presenter/discussant rows reached zod validation
// and failed with a generic "Full name is required" error. parsePeople now
// strips rows where both fullName and handleOrUrl are blank.
// Found by /qa on 2026-05-21
// Report: .gstack/qa-reports/qa-report-cps-vmr-publisher-vercel-app-pdf-pipeline-2026-05-21.md

import { describe, expect, it } from "vitest";

import { parseSubmissionFormData } from "../submission";

function makeFormData(overrides: Partial<Record<string, string>> = {}): FormData {
  const fd = new FormData();
  fd.append("templateType", "custom");
  fd.append("sessionDate", "2026-05-21");
  fd.append("customTitle", "Test");
  fd.append("chiefComplaint", "");
  fd.append("youtubeUrl", "");
  fd.append("notes", "");
  fd.append(
    "presenters",
    overrides.presenters ?? JSON.stringify([{ fullName: "Alice", linkType: "none", handleOrUrl: "" }]),
  );
  fd.append(
    "discussants",
    overrides.discussants ?? JSON.stringify([{ fullName: "Bob", linkType: "none", handleOrUrl: "" }]),
  );
  return fd;
}

describe("parseSubmissionFormData — empty-row filtering", () => {
  it("accepts one filled discussant plus one fully-blank trailing row (original bug)", () => {
    const fd = makeFormData({
      discussants: JSON.stringify([
        { fullName: "Bob", linkType: "none", handleOrUrl: "" },
        { fullName: "", linkType: "none", handleOrUrl: "" },
      ]),
    });
    const parsed = parseSubmissionFormData(fd);
    expect(parsed.discussants).toHaveLength(1);
    expect(parsed.discussants[0].fullName).toBe("Bob");
  });

  it("strips a fully-blank presenter row that a user added then abandoned", () => {
    const fd = makeFormData({
      presenters: JSON.stringify([
        { fullName: "Alice", linkType: "none", handleOrUrl: "" },
        { fullName: "", linkType: "none", handleOrUrl: "" },
        { fullName: "Carol", linkType: "x", handleOrUrl: "@carol" },
      ]),
    });
    const parsed = parseSubmissionFormData(fd);
    expect(parsed.presenters).toHaveLength(2);
    expect(parsed.presenters.map((p) => p.fullName)).toEqual(["Alice", "Carol"]);
  });

  it("keeps a row that has a handle but no name (treat as not blank)", () => {
    // This is a defensive case: user typed a handle and forgot the name.
    // We want zod to surface a clear "Full name is required" error rather
    // than silently dropping their input.
    const fd = makeFormData({
      discussants: JSON.stringify([
        { fullName: "", linkType: "x", handleOrUrl: "@somehandle" },
      ]),
    });
    expect(() => parseSubmissionFormData(fd)).toThrow(/full name/i);
  });

  it("still rejects when all presenter rows are blank (schema min(1))", () => {
    const fd = makeFormData({
      presenters: JSON.stringify([
        { fullName: "", linkType: "none", handleOrUrl: "" },
        { fullName: "", linkType: "none", handleOrUrl: "" },
      ]),
    });
    expect(() => parseSubmissionFormData(fd)).toThrow(/presenter/i);
  });

  it("trims whitespace-only fullName as blank", () => {
    const fd = makeFormData({
      discussants: JSON.stringify([
        { fullName: "Bob", linkType: "none", handleOrUrl: "" },
        { fullName: "   ", linkType: "none", handleOrUrl: "  " },
      ]),
    });
    const parsed = parseSubmissionFormData(fd);
    expect(parsed.discussants).toHaveLength(1);
    expect(parsed.discussants[0].fullName).toBe("Bob");
  });
});
