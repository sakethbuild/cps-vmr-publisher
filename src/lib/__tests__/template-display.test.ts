import { describe, expect, it } from "vitest";

import {
  getPublicTemplateLabel,
  getTemplateBadgeStyle,
} from "../template-display";

describe("getPublicTemplateLabel", () => {
  it("shows 'Virtual Morning Report' for standard (not the internal 'Standard')", () => {
    expect(getPublicTemplateLabel("standard")).toBe("Virtual Morning Report");
  });

  it("shows the submitter's custom title for custom VMRs", () => {
    expect(getPublicTemplateLabel("custom", "Academy Session")).toBe(
      "Academy Session",
    );
    expect(getPublicTemplateLabel("custom", "  Journal Club  ")).toBe(
      "Journal Club",
    );
  });

  it("falls back to 'Custom VMR' when a custom VMR has no title", () => {
    expect(getPublicTemplateLabel("custom", "")).toBe("Custom VMR");
    expect(getPublicTemplateLabel("custom", null)).toBe("Custom VMR");
    expect(getPublicTemplateLabel("custom")).toBe("Custom VMR");
  });

  it("expands IMG to International Medical Graduate VMR", () => {
    expect(getPublicTemplateLabel("img_vmr")).toBe(
      "International Medical Graduate VMR",
    );
  });

  it("uses the normal label for other known types", () => {
    expect(getPublicTemplateLabel("sunday_fundamentals")).toBe(
      "Sunday Fundamentals",
    );
    expect(getPublicTemplateLabel("mainstream_mondays")).toBe(
      "Mainstream Mondays VMR",
    );
    expect(getPublicTemplateLabel("raphael_medina_subspecialty")).toBe(
      "Rafael Medina Subspecialty",
    );
  });

  it("falls back to the raw key for unknown types", () => {
    expect(getPublicTemplateLabel("something_else")).toBe("something_else");
  });
});

describe("getTemplateBadgeStyle", () => {
  it("groups Sunday Fundamentals + Mainstream Mondays as the same green", () => {
    const sunday = getTemplateBadgeStyle("sunday_fundamentals");
    const monday = getTemplateBadgeStyle("mainstream_mondays");
    expect(sunday.muted).toContain("status-success");
    expect(monday.muted).toBe(sunday.muted);
  });

  it("gives standard (Virtual Morning Report) the accent/blue treatment", () => {
    expect(getTemplateBadgeStyle("standard").muted).toContain("accent");
    expect(getTemplateBadgeStyle("standard").dot).toContain("accent");
  });

  it("gives simplicity + academy distinct (teal/pink) hues", () => {
    expect(getTemplateBadgeStyle("simplicity_in_complexity_vmr").muted).toContain(
      "teal",
    );
    expect(getTemplateBadgeStyle("academy_session").muted).toContain("pink");
  });

  it("returns a neutral fallback for unknown types", () => {
    const style = getTemplateBadgeStyle("nope");
    expect(style.muted).toContain("surface-tertiary");
    expect(style.dot).toBeTruthy();
  });
});
