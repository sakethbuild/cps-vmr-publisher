import Image from "next/image";
import type { TemplateType } from "@prisma/client";

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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>
        Watch on YouTube
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

  return (
    <article className={cn("space-y-5", className)}>
      {/* Title block */}
      <header>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-text-primary sm:text-[28px]">
          {title}
        </h1>
        {sessionDateLabel && (
          <p className="mt-2 text-sm text-text-muted">{sessionDateLabel}</p>
        )}
      </header>

      {/* ── Standard / Raphael / IMG VMR ── */}
      {isStandardPreview(templateType) && (
        <>
          {/* Video hero */}
          {youtubeUrl && <YouTubeEmbed url={youtubeUrl} title={title} />}

          {/* Presenter + discussant chips */}
          {(presenters.length > 0 || discussants.length > 0) && (
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

          {/* Whiteboard CTA */}
          {fileUrl && (
            <div>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                View Whiteboard
              </a>
            </div>
          )}

          {/* Chief concern */}
          {chiefComplaint?.trim() && (
            <DetailSection title="Chief Concern">
              <p className="text-[15px] font-medium text-status-warning">
                {chiefComplaint.trim()}
              </p>
            </DetailSection>
          )}

          {/* Case summary / teaching points */}
          {noteParagraphs && (
            <DetailSection title="Case Summary & Teaching Points">
              <div className="space-y-3 text-sm">{noteParagraphs}</div>
            </DetailSection>
          )}
        </>
      )}

      {/* ── Sunday Fundamentals ── */}
      {templateType === "sunday_fundamentals" && (
        <>
          {previewImageUrl ? (
            <Image
              src={previewImageUrl}
              alt={`${title} whiteboard`}
              width={1200}
              height={900}
              className="w-full rounded-[10px] border border-border-default object-cover"
              unoptimized
            />
          ) : (
            <div className="rounded-[10px] border-2 border-dashed border-border-default bg-surface-tertiary px-4 py-12 text-center text-sm text-text-muted">
              Whiteboard image will appear here.
            </div>
          )}

          {chiefComplaint?.trim() && (
            <DetailSection title="Chief Concern">
              <p className="text-[15px] font-medium text-status-warning">
                {chiefComplaint.trim()}
              </p>
            </DetailSection>
          )}

          {noteParagraphs && (
            <DetailSection title="Notes">
              <div className="space-y-3 text-sm">{noteParagraphs}</div>
            </DetailSection>
          )}
        </>
      )}

      {/* ── Custom ── */}
      {templateType === "custom" && (
        <>
          {youtubeUrl && <YouTubeEmbed url={youtubeUrl} title={title} />}

          {chiefComplaint?.trim() && (
            <DetailSection title="Chief Concern">
              <p className="text-[15px] font-medium text-status-warning">
                {chiefComplaint.trim()}
              </p>
            </DetailSection>
          )}

          {noteParagraphs && (
            <DetailSection title="Notes">
              <div className="space-y-3 text-sm">{noteParagraphs}</div>
            </DetailSection>
          )}

          {fileUrl && (
            <div>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Open uploaded file
              </a>
            </div>
          )}
        </>
      )}
    </article>
  );
}
