import { describe, expect, it } from "vitest";

import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_UPLOAD_EXTENSIONS,
  IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  TEMPLATE_TYPE_OPTIONS,
  TEMPLATE_UPLOAD_RULES,
  UPLOAD_MIME_TYPES,
} from "../constants";

describe("TEMPLATE_UPLOAD_RULES", () => {
  it("has a rule for every template type", () => {
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      expect(TEMPLATE_UPLOAD_RULES[template]).toBeDefined();
    }
  });

  it("allows PNG, JPG, JPEG, and PDF for every template", () => {
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      const rule = TEMPLATE_UPLOAD_RULES[template];
      expect(rule.allowedExtensions).toEqual(ALLOWED_UPLOAD_EXTENSIONS);
    }
  });

  it("marks custom as not required and all others as required", () => {
    expect(TEMPLATE_UPLOAD_RULES.custom.required).toBe(false);
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      if (template === "custom") continue;
      expect(TEMPLATE_UPLOAD_RULES[template].required).toBe(true);
    }
  });

  it("sets the size cap to 5 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });

  it("maps each upload extension to a valid MIME type", () => {
    expect(UPLOAD_MIME_TYPES.png).toBe("image/png");
    expect(UPLOAD_MIME_TYPES.jpg).toBe("image/jpeg");
    expect(UPLOAD_MIME_TYPES.jpeg).toBe("image/jpeg");
    expect(UPLOAD_MIME_TYPES.pdf).toBe("application/pdf");
  });

  it("keeps IMAGE_MIME_TYPES as image-only subset (no pdf)", () => {
    expect(IMAGE_MIME_TYPES.png).toBe("image/png");
    expect(IMAGE_MIME_TYPES.jpg).toBe("image/jpeg");
    expect(IMAGE_MIME_TYPES.jpeg).toBe("image/jpeg");
    expect((IMAGE_MIME_TYPES as Record<string, string>).pdf).toBeUndefined();
  });

  it("ALLOWED_IMAGE_EXTENSIONS does not include pdf (image-only post-conversion)", () => {
    expect(ALLOWED_IMAGE_EXTENSIONS.includes("pdf" as never)).toBe(false);
  });
});
