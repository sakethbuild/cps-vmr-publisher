import { describe, expect, it } from "vitest";

import { parseSessionDateInput } from "../dates";
import {
  buildSanitizedFilename,
  isAllowedUpload,
  requiresPrimaryUpload,
} from "../files";
import { normalizePersonUrl } from "../links";
import {
  buildSubmissionPublicPath,
  buildSubmissionPublicUrl,
  buildSubmissionSlug,
  buildWordPressLinkLabel,
} from "../public-pages";
import { buildLinkedPeople, renderLinkedPeopleHtml } from "../preview";
import { calculateSubmissionStatus, hasRequiredSubmissionFields } from "../statuses";
import { generateSubmissionTitle } from "../templates";

describe("submission utilities", () => {
  it("formats titles for each template type", () => {
    const sessionDate = parseSessionDateInput("2026-03-14");

    expect(
      generateSubmissionTitle({
        templateType: "standard",
        sessionDate,
      }),
    ).toBe("Virtual Morning Report - March 14, 2026");

    expect(
      generateSubmissionTitle({
        templateType: "standard",
        sessionDate,
        chiefComplaint: "Chest Pain",
      }),
    ).toBe("Virtual Morning Report - March 14, 2026 - Chest Pain");

    expect(
      generateSubmissionTitle({
        templateType: "raphael_medina_subspecialty",
        sessionDate,
        subspecialty: "Cardiology",
      }),
    ).toBe("Raphael Medina Subspecialty VMR - Cardiology - March 14, 2026");

    expect(
      generateSubmissionTitle({
        templateType: "img_vmr",
        sessionDate,
        residencyProgram: "CPS Internal Medicine",
      }),
    ).toBe("IMG Virtual Morning Report - CPS Internal Medicine - March 14, 2026");

    expect(
      generateSubmissionTitle({
        templateType: "sunday_fundamentals",
        sessionDate,
      }),
    ).toBe("Sunday Fundamentals VMR - March 14, 2026");

    expect(
      generateSubmissionTitle({
        templateType: "custom",
        sessionDate,
        customTitle: "Exact Custom Title",
      }),
    ).toBe("Exact Custom Title");
  });

  it("normalizes X, Instagram, and custom links", () => {
    expect(normalizePersonUrl("x", "@nightshiftlabs")).toBe(
      "https://x.com/nightshiftlabs",
    );
    expect(normalizePersonUrl("instagram", "cpsteam")).toBe(
      "https://instagram.com/cpsteam",
    );
    expect(normalizePersonUrl("custom", "https://example.com/profile")).toBe(
      "https://example.com/profile",
    );
    expect(normalizePersonUrl("none", "@ignored")).toBeNull();
  });

  it("calculates workflow status correctly", () => {
    expect(
      calculateSubmissionStatus({
        templateType: "standard",
        sessionDate: "2026-03-14",
        hasUpload: true,
        youtubeUrl: "",
      }),
    ).toBe("awaiting_youtube");

    expect(
      calculateSubmissionStatus({
        templateType: "standard",
        sessionDate: "2026-03-14",
        hasUpload: true,
        youtubeUrl: "https://youtube.com/watch?v=ready",
      }),
    ).toBe("ready_to_publish");

    expect(
      calculateSubmissionStatus({
        templateType: "sunday_fundamentals",
        sessionDate: "2026-03-14",
        hasUpload: true,
      }),
    ).toBe("ready_to_publish");

    expect(
      calculateSubmissionStatus({
        templateType: "custom",
        sessionDate: "2026-03-14",
        customTitle: "Custom Title",
      }),
    ).toBe("ready_to_publish");
  });

  it("sanitizes filenames and validates upload types", () => {
    expect(
      buildSanitizedFilename({
        templateType: "standard",
        sessionDate: "2026-03-14",
        extension: "pdf",
      }),
    ).toBe("virtual-morning-report-march-14-2026.pdf");

    expect(
      buildSanitizedFilename({
        templateType: "sunday_fundamentals",
        sessionDate: "2026-03-14",
        extension: "png",
      }),
    ).toBe("sunday-fundamentals-vmr-march-14-2026.png");

    expect(isAllowedUpload("standard", "pdf")).toBe(true);
    expect(isAllowedUpload("standard", "png")).toBe(false);
    expect(isAllowedUpload("sunday_fundamentals", "png")).toBe(true);
    expect(isAllowedUpload("sunday_fundamentals", "pdf")).toBe(true);
    expect(requiresPrimaryUpload("standard")).toBe(true);
    expect(requiresPrimaryUpload("custom")).toBe(false);
  });

  it("renders linked people for public pages", () => {
    const linkedPeople = buildLinkedPeople([
      {
        fullName: "Dr. Maya Patel",
        linkType: "x",
        handleOrUrl: "@mayapatel",
      },
      {
        fullName: "Dr. Chris Ncube",
        linkType: "none",
      },
    ]);

    expect(renderLinkedPeopleHtml(linkedPeople)).toBe(
      '<a href="https://x.com/mayapatel">Dr. Maya Patel</a>, Dr. Chris Ncube',
    );
  });

  it("builds public slugs and URLs", () => {
    expect(buildSubmissionSlug("Virtual Morning Report - March 14, 2026")).toBe(
      "virtual-morning-report-march-14-2026",
    );
    expect(buildSubmissionPublicPath("virtual-morning-report-march-14-2026")).toBe(
      "/vmr/virtual-morning-report-march-14-2026",
    );
    expect(buildSubmissionPublicUrl("virtual-morning-report-march-14-2026")).toBe(
      "http://localhost:3000/vmr/virtual-morning-report-march-14-2026",
    );
    expect(buildWordPressLinkLabel("Virtual Morning Report - March 14, 2026")).toBe(
      "Read Virtual Morning Report - March 14, 2026",
    );
  });

  it("checks template-specific required fields", () => {
    expect(
      hasRequiredSubmissionFields({
        templateType: "img_vmr",
        sessionDate: "2026-03-14",
        residencyProgram: "Program",
        hasUpload: true,
      }),
    ).toBe(true);

    expect(
      hasRequiredSubmissionFields({
        templateType: "img_vmr",
        sessionDate: "2026-03-14",
        residencyProgram: "",
        hasUpload: true,
      }),
    ).toBe(false);
  });
});
