import type { AllowedUploadExtension } from "@/lib/constants";

const PDF_SIGNATURE = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

export type DetectedFormat = "pdf";

export type ImageVerificationResult =
  | { ok: true; format: DetectedFormat }
  | { ok: false; reason: string };

export function verifyImageMagicBytes(
  bytes: Buffer,
  expectedExtension: AllowedUploadExtension,
): ImageVerificationResult {
  if (bytes.length < 8) {
    return { ok: false, reason: "Uploaded file is too small to be a valid PDF." };
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
      "This isn't a valid PDF. Export your slides as PDF from PowerPoint or Keynote and try again.",
  };
}
