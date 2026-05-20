import { describe, expect, it } from "vitest";

import {
  ALLOWED_IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  TEMPLATE_TYPE_OPTIONS,
  TEMPLATE_UPLOAD_RULES,
} from "../constants";

describe("TEMPLATE_UPLOAD_RULES", () => {
  it("has a rule for every template type", () => {
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      expect(TEMPLATE_UPLOAD_RULES[template]).toBeDefined();
    }
  });

  it("allows PNG, JPG, and JPEG for every template", () => {
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      const rule = TEMPLATE_UPLOAD_RULES[template];
      expect(rule.allowedExtensions).toEqual(ALLOWED_IMAGE_EXTENSIONS);
    }
  });

  it("marks custom as not required and all others as required", () => {
    expect(TEMPLATE_UPLOAD_RULES.custom.required).toBe(false);
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      if (template === "custom") continue;
      expect(TEMPLATE_UPLOAD_RULES[template].required).toBe(true);
    }
  });

  it("does not include PDF in any allowed-extensions list", () => {
    for (const template of TEMPLATE_TYPE_OPTIONS) {
      expect(
        TEMPLATE_UPLOAD_RULES[template].allowedExtensions.includes("pdf" as never),
      ).toBe(false);
    }
  });

  it("sets the size cap to 5 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });

  it("maps each extension to a valid image MIME type", () => {
    expect(IMAGE_MIME_TYPES.png).toBe("image/png");
    expect(IMAGE_MIME_TYPES.jpg).toBe("image/jpeg");
    expect(IMAGE_MIME_TYPES.jpeg).toBe("image/jpeg");
  });
});
