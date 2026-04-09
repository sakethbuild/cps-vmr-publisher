import Image from "next/image";
import type { TemplateType } from "@prisma/client";

import { PeoplePreview } from "@/components/people-preview";
import type { LinkedPerson } from "@/lib/preview";
import { isStandardPreview } from "@/lib/preview";
import { cn } from "@/lib/ui";

// ---------------------------------------------------------------------------
// YouTube helpers
// ---------------------------------------------------------------------------

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    // youtu.be/ID
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("?")[0] ?? null;
    }
    // youtube.com/watch?v=ID  or  youtube.com/embed/ID  or  youtube.com/shorts/ID
    const vParam = parsed.searchParams.get("v");
    if (vParam) return vParam;
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const embedIndex = pathParts.indexOf("embed");
    const shortsIndex = pathParts.indexOf("shorts");
    if (embedIndex !== -1) return pathParts[embedIndex + 1] ?? null;
    if (shortsIndex !== -1) return pathParts[shortsIndex + 1] ?? null;
    return null;
  } catch {
    return null;
  }
}

function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        Watch on YouTube
      </a>
    );
  }
  return (
    <div className="w-full overflow-hidden rounded-xl aspect-video bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notes renderer
// ---------------------------------------------------------------------------

function renderNoteParagraphs(notes?: string | null) {
  const paragraphs = notes
    ?.split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs?.length) {
    return null;
  }

  return paragraphs.map((paragraph, index) => (
    <p key={`${paragraph}-${index}`} className="text-gray-700 leading-7">
      {paragraph}
    </p>
  ));
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SubmissionPublicView({
  templateType,
  title,
  sessionDateLabel,
  chiefComplaint,
  presenters,
  discussants,
  fileUrl,
  previewImageUrl,
  notes,
  youtubeUrl,
  className,
}: {
  templateType: TemplateType;
  title: string;
  sessionDateLabel?: string | null;
  chiefComplaint?: string | null;
  presenters: LinkedPerson[];
  discussants: LinkedPerson[];
  fileUrl?: string | null;
  previewImageUrl?: string | null;
  notes?: string | null;
  youtubeUrl?: string | null;
  className?: string;
}) {
  const noteParagraphs = renderNoteParagraphs(notes);

  return (
    <article className={cn("space-y-6", className)}>

      {/* Title block */}
      <header className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
          {title}
        </h1>
        {sessionDateLabel ? (
          <p className="mt-2 text-sm text-gray-500">{sessionDateLabel}</p>
        ) : null}
        {chiefComplaint?.trim() ? (
          <p className="mt-3 text-base text-gray-700">
            <span className="font-semibold text-gray-900">Chief Concern:</span>{" "}
            {chiefComplaint.trim()}
          </p>
        ) : null}
      </header>

      {/* Standard VMR (standard / raphael medina / IMG) */}
      {isStandardPreview(templateType) ? (
        <div className="space-y-6">

          {/* YouTube embed */}
          {youtubeUrl ? (
            <YouTubeEmbed url={youtubeUrl} title={title} />
          ) : null}

          {/* Presenters & Discussants */}
          <div className="space-y-2 text-sm sm:text-base leading-7 text-gray-700">
            {presenters.length > 0 ? (
              <p>
                <span className="font-semibold text-gray-900">
                  Case Presenter{presenters.length > 1 ? "s" : ""}:
                </span>{" "}
                <PeoplePreview people={presenters} emptyLabel="" />
              </p>
            ) : null}
            {discussants.length > 0 ? (
              <p>
                <span className="font-semibold text-gray-900">Case Discussants:</span>{" "}
                <PeoplePreview people={discussants} emptyLabel="" />
              </p>
            ) : null}
          </div>

          {/* Teaching points / notes */}
          {noteParagraphs ? (
            <div className="space-y-3">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">
                Case Summary &amp; Teaching Points
              </p>
              <div className="space-y-3 text-sm sm:text-base">{noteParagraphs}</div>
            </div>
          ) : null}

          {/* PDF download */}
          {fileUrl ? (
            <div className="pt-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
              >
                Case Summary &amp; Teaching Points (PDF)
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Sunday Fundamentals */}
      {templateType === "sunday_fundamentals" ? (
        <div className="space-y-6">
          {previewImageUrl ? (
            <Image
              src={previewImageUrl}
              alt={`${title} whiteboard`}
              width={1200}
              height={900}
              className="w-full rounded-xl border border-gray-200 object-cover"
              unoptimized
            />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-12 text-center text-sm text-gray-400">
              Whiteboard image will appear here.
            </div>
          )}
          {noteParagraphs ? (
            <div className="space-y-3 text-sm sm:text-base">{noteParagraphs}</div>
          ) : null}
        </div>
      ) : null}

      {/* Custom VMR */}
      {templateType === "custom" ? (
        <div className="space-y-5">
          {youtubeUrl ? (
            <YouTubeEmbed url={youtubeUrl} title={title} />
          ) : null}
          {noteParagraphs ? (
            <div className="space-y-3 text-sm sm:text-base">{noteParagraphs}</div>
          ) : null}
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Open uploaded file
            </a>
          ) : null}
        </div>
      ) : null}

    </article>
  );
}
