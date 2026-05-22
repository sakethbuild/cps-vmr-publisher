import { describe, expect, it } from "vitest";

import {
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  TEMPLATE_TYPE_OPTIONS,
  TEMPLATE_UPLOAD_RULES,
  THUMBNAIL_EXTENSION,
  THUMBNAIL_MIME_TYPE,
  UPLOAD_MIME_TYPES,
} from "../constants";

describe("TEMPLATE_UPLOAD_RULES — PDF only", () => {
  it("has a rule for every template type", () => {
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      expect(TEMPLATE_UPLOAD_RULES[template]).toBeDefined();
    }
  });

  it("allows ONLY PDF for every template", () => {
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      const rule = TEMPLATE_UPLOAD_RULES[template];
      expect(rule.allowedExtensions).toEqual(["pdf"]);
    }
  });

  it("marks custom as not required and all others as required", () => {
    expect(TEMPLATE_UPLOAD_RULES.custom.required).toBe(false);
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      if (template === "custom") continue;
      expect(TEMPLATE_UPLOAD_RULES[template].required).toBe(true);
    }
  });

  it("ALLOWED_UPLOAD_EXTENSIONS contains only 'pdf'", () => {
    expect(ALLOWED_UPLOAD_EXTENSIONS).toEqual(["pdf"]);
  });

  it("sets the size cap to 5 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });

  it("maps pdf to application/pdf", () => {
    expect(UPLOAD_MIME_TYPES.pdf).toBe("application/pdf");
  });

  it("defines the thumbnail format as PNG", () => {
    expect(THUMBNAIL_MIME_TYPE).toBe("image/png");
    expect(THUMBNAIL_EXTENSION).toBe("png");
  });
});
