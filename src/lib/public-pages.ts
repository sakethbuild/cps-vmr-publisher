import { getEnv } from "@/lib/env";
import { sanitizeSlugPart } from "@/lib/files";

export function buildSubmissionSlug(title: string): string {
  return sanitizeSlugPart(title) || "vmr";
}

export async function resolveUniqueSubmissionSlug(
  title: string,
  isSlugTaken: (slug: string) => Promise<boolean>,
) {
  const baseSlug = buildSubmissionSlug(title);
  let candidate = baseSlug;
  let suffix = 2;

  while (await isSlugTaken(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function buildSubmissionPublicPath(slug: string) {
  return `/vmr/${slug}`;
}

export function buildSubmissionPublicUrl(slug: string) {
  return `${getEnv().appBaseUrl}${buildSubmissionPublicPath(slug)}`;
}

export function buildWordPressLinkLabel(title: string) {
  return `Read ${title}`;
}
