import { sanitizeSlugPart } from "@/lib/files";
import type {
  SubmissionWithPeople,
  WordPressDraftResult,
  WordPressPublisher,
} from "@/lib/wordpress/publisher";

export class MockWordPressPublisher implements WordPressPublisher {
  async createDraft(submission: SubmissionWithPeople): Promise<WordPressDraftResult> {
    const slug = sanitizeSlugPart(submission.title);
    const pageId = `mock-${submission.id.slice(0, 8)}`;
    const primaryMediaUrl = submission.storagePath
      ? `https://mock-wordpress.local/media/${submission.sanitizedFileName ?? `${slug}.pdf`}`
      : null;
    const previewMediaUrl = submission.previewImagePath
      ? `https://mock-wordpress.local/media/${(submission.sanitizedFileName ?? `${slug}.png`).replace(/\.[^.]+$/, ".png")}`
      : null;

    return {
      mode: "mock",
      pageId,
      url: `https://mock-wordpress.local/drafts/${slug}-${pageId}`,
      primaryMediaUrl,
      previewMediaUrl,
    };
  }
}
