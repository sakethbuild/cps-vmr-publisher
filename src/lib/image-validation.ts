import type { AllowedUploadExtension } from "@/lib/constants";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SOI = Buffer.from([0xff, 0xd8, 0xff]);
const PDF_SIGNATURE = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

export type DetectedFormat = "png" | "jpeg" | "pdf";

export type ImageVerificationResult =
  | { ok: true; format: DetectedFormat }
  | { ok: false; reason: string };

export function verifyImageMagicBytes(
  bytes: Buffer,
  expectedExtension: AllowedUploadExtension,
): ImageVerificationResult {
  if (bytes.length < 8) {
    return { ok: false, reason: "Uploaded file is too small to be a valid image or PDF." };
  }

  const pngHeader = bytes.subarray(0, 8);
  if (pngHeader.equals(PNG_SIGNATURE)) {
    if (expectedExtension !== "png") {
      return {
        ok: false,
        reason: "File header is PNG but the upload was declared as a different format.",
      };
    }
    return { ok: true, format: "png" };
  }

  const jpegHeader = bytes.subarray(0, 3);
  if (jpegHeader.equals(JPEG_SOI)) {
    if (expectedExtension !== "jpg" && expectedExtension !== "jpeg") {
      return {
        ok: false,
        reason: "File header is JPEG but the upload was declared as a different format.",
      };
    }
    return { ok: true, format: "jpeg" };
  }

  const pdfHeader = bytes.subarray(0, 5);
  if (pdfHeader.equals(PDF_SIGNATURE)) {
    if (expectedExtension !== "pdf") {
      return {
        ok: false,
        reason: "File header is PDF but the upload was declared as a different format.",
      };
    }
    return { ok: true, format: "pdf" };
  }

  return {
    ok: false,
    reason:
      "This isn't a valid image or PDF. Export your slide as PNG, JPG, or PDF and try again.",
  };
}
