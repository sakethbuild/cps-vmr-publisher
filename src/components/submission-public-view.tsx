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
    <div className="aspect-video w-full overflow-hidden rounded-[10px] border border-border-default bg-black">
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

function ImageHero({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-[10px] border border-border-default bg-black">
      <ImageLightbox src={src} alt={alt} className="block h-full w-full" />
    </div>
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
  const heroImageUrl = fileUrl ?? previewImageUrl ?? null;

  return (
    <article className={cn("space-y-5", className)}>
      {heroImageUrl && (
        <ImageHero src={heroImageUrl} alt={`${title} whiteboard`} />
      )}

      <header>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-text-primary sm:text-[28px]">
          {title}
        </h1>
        {sessionDateLabel && (
          <p className="mt-2 text-sm text-text-muted">{sessionDateLabel}</p>
        )}
      </header>

      {chiefComplaint?.trim() && (
        <DetailSection title="Chief Concern">
          <p className="text-[15px] font-medium text-status-warning">
            {chiefComplaint.trim()}
          </p>
        </DetailSection>
      )}

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
