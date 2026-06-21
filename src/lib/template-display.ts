import { TEMPLATE_TYPE_LABELS } from "@/lib/constants";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

// Archive preview image: prefer the YouTube still when there's a recording, fall
// back to the auto-generated PDF whiteboard. Shared by the card + the list row.
export function resolveArchiveThumbnail(submission: {
  youtubeUrl: string | null;
  thumbnailPath: string | null;
}): string | null {
  if (submission.youtubeUrl?.trim()) {
    const ytThumb = getYouTubeThumbnailUrl(submission.youtubeUrl);
    if (ytThumb) return ytThumb;
  }
  return submission.thumbnailPath;
}

// Public-facing type label for the archive (card + list row).
//  - "standard" reads as "Virtual Morning Report" for visitors, even though the
//    publisher keeps the shorter internal "Standard" label.
//  - "custom" shows the actual custom VMR name the submitter typed, falling back
//    to the generic label when (somehow) there's no custom title.
//  - Everything else uses its normal label (e.g. IMG → "International Medical
//    Graduate VMR").
export function getPublicTemplateLabel(
  templateType: string,
  customTitle?: string | null,
): string {
  if (templateType === "standard") return "Virtual Morning Report";
  if (templateType === "custom") return customTitle?.trim() || "Custom VMR";
  return TEMPLATE_TYPE_LABELS[templateType] ?? templateType;
}

// Colour-coding for the small type oval on the public archive (item: colour
// code the label, NOT the whole card). Two treatments per type:
//  - `muted`: tinted background + coloured text, used on the list row where the
//    oval sits on a plain surface (matches the app's existing badge pattern).
//  - `dot`: a small coloured dot shown alongside white text on a dark scrim, used
//    on the grid card where the oval sits over a thumbnail. White-on-dark keeps
//    AA contrast over any image; the dot + the label text carry the category, so
//    colour is never the sole signal.
// Colours come from the design-system tokens (accent/success/warning/published)
// plus two extra hues (teal/pink) defined in globals.css so simplicity + academy
// stay distinct without overloading the status palette.
export type TemplateBadgeStyle = { muted: string; dot: string };

const TEMPLATE_BADGE_STYLES: Record<string, TemplateBadgeStyle> = {
  // Virtual Morning Report — blue
  standard: { muted: "bg-accent-muted text-accent", dot: "bg-accent" },
  // Sunday / Monday fundamentals — green
  sunday_fundamentals: {
    muted: "bg-status-success-muted text-status-success",
    dot: "bg-status-success",
  },
  mainstream_mondays: {
    muted: "bg-status-success-muted text-status-success",
    dot: "bg-status-success",
  },
  // International Medical Graduate — orange
  img_vmr: {
    muted: "bg-status-warning-muted text-status-warning",
    dot: "bg-status-warning",
  },
  // Rafael Medina Subspecialty — purple
  raphael_medina_subspecialty: {
    muted: "bg-status-published-muted text-status-published",
    dot: "bg-status-published",
  },
  // Simplicity in Complexity — teal
  simplicity_in_complexity_vmr: {
    muted: "bg-[var(--teal-muted)] text-[var(--teal)]",
    dot: "bg-[var(--teal)]",
  },
  // Academy Session — pink
  academy_session: {
    muted: "bg-[var(--pink-muted)] text-[var(--pink)]",
    dot: "bg-[var(--pink)]",
  },
  // Custom — neutral (no strong colour; the label itself carries the meaning)
  custom: {
    muted: "bg-surface-tertiary text-text-secondary",
    dot: "bg-text-muted",
  },
};

const DEFAULT_BADGE_STYLE: TemplateBadgeStyle = {
  muted: "bg-surface-tertiary text-text-secondary",
  dot: "bg-text-muted",
};

export function getTemplateBadgeStyle(templateType: string): TemplateBadgeStyle {
  return TEMPLATE_BADGE_STYLES[templateType] ?? DEFAULT_BADGE_STYLE;
}
