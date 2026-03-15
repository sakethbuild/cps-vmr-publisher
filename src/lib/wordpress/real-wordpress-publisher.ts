import { Buffer } from "node:buffer";

import { getEnv } from "@/lib/env";
import { getStorageService } from "@/lib/storage";
import { buildWordPressDraftContent } from "@/lib/wordpress/draft-content";
import type {
  SubmissionWithPeople,
  WordPressDraftResult,
  WordPressPublisher,
} from "@/lib/wordpress/publisher";

type WordPressMediaResponse = {
  id: number;
  source_url?: string;
  guid?: {
    rendered?: string;
  };
};

type WordPressPageResponse = {
  id: number;
  link?: string;
};

type UploadedWordPressAssets = {
  primaryMediaUrl: string | null;
  previewMediaUrl: string | null;
};

export class RealWordPressPublisher implements WordPressPublisher {
  private readonly env = getEnv();
  private readonly storage = getStorageService();

  async createDraft(submission: SubmissionWithPeople): Promise<WordPressDraftResult> {
    this.validateConfig();

    this.log("info", `Creating real WordPress draft for submission ${submission.id}`);
    const uploadedAssets = await this.uploadRelevantAssets(submission);
    const content = buildWordPressDraftContent(submission, uploadedAssets);

    const page = await this.createDraftPage({
      title: submission.title,
      content,
    });

    this.log(
      "info",
      `Created WordPress draft ${page.id} for submission ${submission.id}`,
    );

    return {
      mode: "real",
      pageId: String(page.id),
      url: page.link ?? `${this.normalizedBaseUrl()}/?page_id=${page.id}`,
      primaryMediaUrl: uploadedAssets.primaryMediaUrl,
      previewMediaUrl: uploadedAssets.previewMediaUrl,
    };
  }

  private validateConfig() {
    if (
      !this.env.wordpressBaseUrl ||
      !this.env.wordpressUsername ||
      !this.env.wordpressApplicationPassword
    ) {
      throw new Error(
        "Missing WordPress environment variables for REAL mode. Check WORDPRESS_BASE_URL, WORDPRESS_USERNAME, and WORDPRESS_APPLICATION_PASSWORD.",
      );
    }
  }

  private normalizedBaseUrl() {
    return this.env.wordpressBaseUrl.replace(/\/+$/, "");
  }

  private authHeader() {
    const token = Buffer.from(
      `${this.env.wordpressUsername}:${this.env.wordpressApplicationPassword}`,
      "utf8",
    ).toString("base64");

    return `Basic ${token}`;
  }

  private async uploadRelevantAssets(
    submission: SubmissionWithPeople,
  ): Promise<UploadedWordPressAssets> {
    const primaryMediaUrl =
      submission.storagePath &&
      submission.fileMimeType &&
      submission.sanitizedFileName &&
      (submission.templateType === "standard" ||
        submission.templateType === "raphael_medina_subspecialty" ||
        submission.templateType === "img_vmr" ||
        submission.templateType === "custom")
        ? await this.uploadMedia({
            relativePath: submission.storagePath,
            filename: submission.sanitizedFileName,
            mimeType: submission.fileMimeType,
          })
        : null;

    const previewMediaUrl =
      submission.templateType === "sunday_fundamentals" &&
      submission.previewImagePath &&
      submission.previewImageMimeType
        ? await this.uploadMedia({
            relativePath: submission.previewImagePath,
            filename: this.getSundayPreviewFilename(submission),
            mimeType: submission.previewImageMimeType,
          })
        : null;

    return {
      primaryMediaUrl,
      previewMediaUrl,
    };
  }

  private async uploadMedia(params: {
    relativePath: string;
    filename: string;
    mimeType: string;
  }) {
    this.log("info", `Uploading media ${params.filename} to WordPress`);
    const buffer = await this.storage.readFile(params.relativePath);
    const response = await fetch(`${this.normalizedBaseUrl()}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": params.mimeType,
        "Content-Disposition": `attachment; filename="${params.filename}"`,
      },
      body: new Uint8Array(buffer),
    });

    const media = await this.parseResponse<WordPressMediaResponse>(
      response,
      `upload media ${params.filename}`,
    );

    const mediaUrl = media.source_url ?? media.guid?.rendered ?? null;

    if (!mediaUrl) {
      throw new Error(
        `WordPress media upload succeeded for ${params.filename} but no media URL was returned.`,
      );
    }

    // TODO(elementor): Attach these media items to the final Elementor/template automation flow.
    return mediaUrl;
  }

  private getSundayPreviewFilename(submission: SubmissionWithPeople) {
    if (!submission.sanitizedFileName) {
      return "sunday-fundamentals.png";
    }

    if (submission.fileExtension === "pdf") {
      return submission.sanitizedFileName.replace(/\.[^.]+$/, ".png");
    }

    return submission.sanitizedFileName;
  }

  private async createDraftPage(params: { title: string; content: string }) {
    this.log("info", `Creating WordPress page draft for "${params.title}"`);
    const response = await fetch(`${this.normalizedBaseUrl()}/wp-json/wp/v2/pages`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: params.title,
        status: "draft",
        content: params.content,
      }),
    });

    return this.parseResponse<WordPressPageResponse>(
      response,
      `create draft page "${params.title}"`,
    );
  }

  private async parseResponse<T>(response: Response, action: string): Promise<T> {
    const rawBody = await response.text();
    const parsedBody = rawBody ? this.tryParseJson(rawBody) : null;

    if (!response.ok) {
      const details =
        typeof parsedBody === "object" && parsedBody && "message" in parsedBody
          ? String(parsedBody.message)
          : rawBody || response.statusText;

      this.log("error", `WordPress ${action} failed: ${response.status} ${details}`);
      throw new Error(`WordPress ${action} failed: ${details}`);
    }

    this.log("info", `WordPress ${action} succeeded`);
    return (parsedBody as T) ?? ({} as T);
  }

  private tryParseJson(value: string) {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private log(level: "info" | "error", message: string) {
    const line = `[wordpress:${level}] ${message}`;

    if (level === "error") {
      console.error(line);
      return;
    }

    console.info(line);
  }
}
