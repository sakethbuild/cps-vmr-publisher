import { describe, expect, it } from "vitest";

import { verifyImageMagicBytes } from "../image-validation";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7"

describe("verifyImageMagicBytes — PDF only", () => {
  it("accepts a real PDF header when pdf declared", () => {
    const result = verifyImageMagicBytes(PDF_HEADER, "pdf");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.format).toBe("pdf");
  });

  it("rejects a PNG (no longer a supported upload format)", () => {
    const result = verifyImageMagicBytes(PNG_HEADER, "pdf");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/PDF/);
    }
  });

  it("rejects a JPEG (no longer a supported upload format)", () => {
    const result = verifyImageMagicBytes(JPEG_HEADER, "pdf");
    expect(result.ok).toBe(false);
  });

  it("rejects empty buffer", () => {
    const result = verifyImageMagicBytes(Buffer.alloc(0), "pdf");
    expect(result.ok).toBe(false);
  });

  it("rejects arbitrary non-PDF binary", () => {
    const result = verifyImageMagicBytes(
      Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]), // MZ (Windows PE)
      "pdf",
    );
    expect(result.ok).toBe(false);
  });
});
