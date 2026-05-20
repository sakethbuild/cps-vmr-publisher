import { describe, expect, it } from "vitest";

import { verifyImageMagicBytes } from "../image-validation";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7"

describe("verifyImageMagicBytes", () => {
  it("accepts a real PNG header when png declared", () => {
    const result = verifyImageMagicBytes(PNG_HEADER, "png");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.format).toBe("png");
  });

  it("accepts a real JPEG header when jpg declared", () => {
    const result = verifyImageMagicBytes(JPEG_HEADER, "jpg");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.format).toBe("jpeg");
  });

  it("accepts JPEG when jpeg declared", () => {
    const result = verifyImageMagicBytes(JPEG_HEADER, "jpeg");
    expect(result.ok).toBe(true);
  });

  it("rejects PDF disguised with PNG extension", () => {
    const result = verifyImageMagicBytes(PDF_HEADER, "png");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/PNG or JPG/);
    }
  });

  it("rejects PNG when JPG was declared (extension mismatch)", () => {
    const result = verifyImageMagicBytes(PNG_HEADER, "jpg");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/declared/i);
    }
  });

  it("rejects JPEG when PNG was declared (extension mismatch)", () => {
    const result = verifyImageMagicBytes(JPEG_HEADER, "png");
    expect(result.ok).toBe(false);
  });

  it("rejects empty buffer", () => {
    const result = verifyImageMagicBytes(Buffer.alloc(0), "png");
    expect(result.ok).toBe(false);
  });

  it("rejects an arbitrary binary that is not PNG or JPEG", () => {
    const result = verifyImageMagicBytes(
      Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]), // MZ (Windows PE)
      "png",
    );
    expect(result.ok).toBe(false);
  });
});
