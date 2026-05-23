import type { TemplateType } from "@prisma/client";

import { ImageLightbox } from "@/components/image-lightbox";
import { PeoplePreview } from "@/components/people-preview";
import type { LinkedPerson } from "@/lib/preview";
import { isStandardPreview } from "@/lib/preview";
import { extractYouTubeId } from "@/lib/youtube";
import { cn } from "@/lib/ui";

function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface-tertiary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
      >
        Watch the full discussion on YouTube
      </a>
    );
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[10px] border border-border-default bg-surface-tertiary">
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium uppercase tracking-wider text-text-muted">
        Loading video…
      </div>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        className="relative h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

function ThumbnailHero({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-[10px] border border-border-default bg-white">
      <ImageLightbox src={src} alt={alt} className="block h-full w-full" />
    </div>
  );
}

function ThumbnailPlaceholder({ title }: { title: string }) {
  return (
    <div
      className="aspect-video w-full rounded-[10px] border border-dashed border-border-default bg-surface-tertiary flex items-center justify-center"
      aria-label={`Preview not available for ${title}`}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
        Preview unavailable
      </span>
    </div>
  );
}

function DownloadPdfButton({ href, fileName }: { href: string; fileName?: string | null }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={fileName ?? undefined}
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download PDF
    </a>
  );
}

function renderNoteParagraphs(notes?: string | null) {
  const paragraphs = notes
    ?.split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paragraphs?.length) return null;
  return paragraphs.map((p, i) => (
    <p key={`${p.slice(0, 20)}-${i}`} className="text-text-secondary leading-7">
      {p}
    </p>
  ));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
      {children}
    </p>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 border-t border-border-default pt-5">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function SubmissionPublicView({
  templateType,
  title,
  sessionDateLabel,
  chiefComplaint,
  presenters,
  discussants,
  pdfUrl,
  thumbnailUrl,
  originalFileName,
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
  pdfUrl?: string | null;
  thumbnailUrl?: string | null;
  originalFileName?: string | null;
  notes?: string | null;
  youtubeUrl?: string | null;
  className?: string;
}) {
  const noteParagraphs = renderNoteParagraphs(notes);

  const hasPreview = Boolean(thumbnailUrl || pdfUrl);

  return (
    <article className={cn("space-y-5", className)}>
      <div
        className={cn(
          hasPreview &&
            "lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-8",
        )}
      >
        {hasPreview && (
          <div className="lg:sticky lg:top-6">
            {thumbnailUrl ? (
              <ThumbnailHero src={thumbnailUrl} alt={`${title} — first page preview`} />
            ) : (
              <ThumbnailPlaceholder title={title} />
            )}
          </div>
        )}

        <div className={cn("space-y-5", hasPreview && "mt-5 lg:mt-0")}>
          <header>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-text-primary sm:text-[28px]">
              {title}
            </h1>
            {sessionDateLabel && (
              <p className="mt-2 text-sm text-text-muted">{sessionDateLabel}</p>
            )}
          </header>

          {pdfUrl && (
            <div className="flex flex-wrap items-center gap-3">
              <DownloadPdfButton href={pdfUrl} fileName={originalFileName} />
              <p className="text-xs text-text-muted">
                Open the full slide deck (PDF).
              </p>
            </div>
          )}

          {chiefComplaint?.trim() && (
            <DetailSection title="Chief Concern">
              <p className="text-[15px] font-semibold text-text-primary">
                {chiefComplaint.trim()}
              </p>
            </DetailSection>
          )}
        </div>
      </div>

      {(presenters.length > 0 || discussants.length > 0) &&
        (isStandardPreview(templateType) || templateType === "sunday_fundamentals") && (
          <div className="flex flex-wrap gap-2">
            {presenters.length > 0 && (
              <div className="flex-1 min-w-[220px] rounded-[10px] border border-border-default bg-surface-secondary px-4 py-3">
                <SectionLabel>
                  Presenter{presenters.length > 1 ? "s" : ""}
                </SectionLabel>
                <div className="mt-1 text-sm text-text-primary">
                  <PeoplePreview people={presenters} emptyLabel="" />
                </div>
              </div>
            )}
            {discussants.length > 0 && (
              <div className="flex-1 min-w-[220px] rounded-[10px] border border-border-default bg-surface-secondary px-4 py-3">
                <SectionLabel>Discussants</SectionLabel>
                <div className="mt-1 text-sm text-text-primary">
                  <PeoplePreview people={discussants} emptyLabel="" />
                </div>
              </div>
            )}
          </div>
        )}

      {youtubeUrl && (
        <DetailSection title="Watch the full discussion">
          <YouTubeEmbed url={youtubeUrl} title={title} />
        </DetailSection>
      )}

      {noteParagraphs && (
        <DetailSection
          title={
            isStandardPreview(templateType)
              ? "Case Summary & Teaching Points"
              : "Notes"
          }
        >
          <div className="space-y-3 text-sm">{noteParagraphs}</div>
        </DetailSection>
      )}
    </article>
  );
}
