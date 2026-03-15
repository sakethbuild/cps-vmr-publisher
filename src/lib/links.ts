import type { PersonLinkType } from "@prisma/client";

export function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, "").replace(/^https?:\/\/(www\.)?/i, "");
}

export function normalizePersonUrl(
  linkType: PersonLinkType,
  handleOrUrl?: string | null,
): string | null {
  if (linkType === "none") {
    return null;
  }

  const rawValue = handleOrUrl?.trim();

  if (!rawValue) {
    return null;
  }

  if (linkType === "custom") {
    return rawValue;
  }

  const normalizedHandle = normalizeHandle(rawValue).split("/").pop() ?? "";

  if (!normalizedHandle) {
    return null;
  }

  if (linkType === "x") {
    return `https://x.com/${normalizedHandle}`;
  }

  return `https://instagram.com/${normalizedHandle}`;
}
