import type { Submission, SubmissionPerson } from "@prisma/client";

import { filterPeopleByRole, renderLinkedPeopleHtml } from "@/lib/preview";
import type { SubmissionWithPeople } from "@/lib/wordpress/publisher";

type UploadedAssets = {
  primaryMediaUrl?: string | null;
  previewMediaUrl?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildStandardLikeContent(
  submission: Submission & { people: SubmissionPerson[] },
  assets: UploadedAssets,
) {
  const presenters = renderLinkedPeopleHtml(
    filterPeopleByRole(submission.people, "presenter"),
  );
  const discussants = renderLinkedPeopleHtml(
    filterPeopleByRole(submission.people, "discussant"),
  );
  const teachingLink = assets.primaryMediaUrl
    ? `<a href="${escapeHtml(assets.primaryMediaUrl)}">Here</a>`
    : "Here";
  const youtubeBlock = submission.youtubeUrl
    ? `<p><strong>YouTube URL:</strong> <a href="${escapeHtml(submission.youtubeUrl)}">${escapeHtml(submission.youtubeUrl)}</a></p>`
    : "<p><strong>YouTube URL:</strong> Add before final template/Elementor wiring.</p>";

  return [
    "<!-- TODO(elementor): Replace this placeholder structure with the final Elementor/template layout. -->",
    "<section>",
    "<p><strong>VMR Draft Placeholder</strong></p>",
    youtubeBlock,
    `<p><strong>Case Presenter:</strong> ${presenters || "Add presenters"}</p>`,
    `<p><strong>Case Discussants:</strong> ${discussants || "Add discussants"}</p>`,
    `<p><strong>Case Summary &amp; Teaching Points:</strong> ${teachingLink}</p>`,
    submission.notes?.trim()
      ? `<p><strong>Internal notes:</strong> ${escapeHtml(submission.notes)}</p>`
      : "",
    "</section>",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSundayContent(
  submission: Submission,
  assets: UploadedAssets,
) {
  const imageLink = assets.previewMediaUrl
    ? `<a href="${escapeHtml(assets.previewMediaUrl)}">${escapeHtml(assets.previewMediaUrl)}</a>`
    : "Upload the Sunday image asset before final layout assembly.";

  return [
    "<!-- TODO(elementor): Replace this placeholder structure with the final image-based Sunday Fundamentals layout. -->",
    "<section>",
    "<p><strong>Sunday Fundamentals Draft Placeholder</strong></p>",
    `<p><strong>Layout:</strong> Image-based layout placeholder. WordPress image asset: ${imageLink}</p>`,
    `<p><strong>Support text:</strong> ${escapeHtml(submission.notes?.trim() || "Add supporting Sunday Fundamentals text.")}</p>`,
    "</section>",
  ].join("\n");
}

function buildCustomContent(
  submission: Submission,
  assets: UploadedAssets,
) {
  const fileLink = assets.primaryMediaUrl
    ? `<a href="${escapeHtml(assets.primaryMediaUrl)}">${escapeHtml(assets.primaryMediaUrl)}</a>`
    : "No uploaded file attached.";

  return [
    "<!-- TODO(elementor): Replace this placeholder structure with the final custom page layout when automation is ready. -->",
    "<section>",
    "<p><strong>Custom Draft Placeholder</strong></p>",
    `<p><strong>Uploaded file:</strong> ${fileLink}</p>`,
    `<p><strong>Notes:</strong> ${escapeHtml(submission.notes?.trim() || "Add custom supporting text.")}</p>`,
    "</section>",
  ].join("\n");
}

export function buildWordPressDraftContent(
  submission: SubmissionWithPeople,
  assets: UploadedAssets,
) {
  switch (submission.templateType) {
    case "standard":
    case "raphael_medina_subspecialty":
    case "img_vmr":
      return buildStandardLikeContent(submission, assets);
    case "sunday_fundamentals":
      return buildSundayContent(submission, assets);
    case "custom":
      return buildCustomContent(submission, assets);
  }
}
