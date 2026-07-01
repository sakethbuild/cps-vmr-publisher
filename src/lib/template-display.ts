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
// Known template types get a curated colour (blue = VMR, green = fundamentals,
// etc.). Custom types have arbitrary user-chosen names, so they can't be
// hand-mapped — instead each distinct custom name is hashed into AUTO_PALETTE
// below, so a new custom type automatically gets its own colour rather than
// every custom sharing one grey.
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
  // NOTE: no `custom` entry — custom types are coloured from AUTO_PALETTE by name.
};

// Distinct hues (defined in globals.css, contrast-tuned for both themes) that
// custom VMR types are hashed into. Deliberately excludes the two primary
// template colours (blue = VMR, green = fundamentals) so a custom never looks
// like the most common templates.
const AUTO_PALETTE: TemplateBadgeStyle[] = [
  { muted: "bg-[var(--cat-red-muted)] text-[var(--cat-red)]", dot: "bg-[var(--cat-red)]" },
  { muted: "bg-[var(--cat-amber-muted)] text-[var(--cat-amber)]", dot: "bg-[var(--cat-amber)]" },
  { muted: "bg-[var(--cat-lime-muted)] text-[var(--cat-lime)]", dot: "bg-[var(--cat-lime)]" },
  { muted: "bg-[var(--cat-cyan-muted)] text-[var(--cat-cyan)]", dot: "bg-[var(--cat-cyan)]" },
  { muted: "bg-[var(--cat-indigo-muted)] text-[var(--cat-indigo)]", dot: "bg-[var(--cat-indigo)]" },
  { muted: "bg-[var(--cat-fuchsia-muted)] text-[var(--cat-fuchsia)]", dot: "bg-[var(--cat-fuchsia)]" },
];

// Stable, well-distributed string hash (djb2-ish) so a given name always maps to
// the same palette slot, everywhere it's rendered.
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getTemplateBadgeStyle(
  templateType: string,
  customTitle?: string | null,
): TemplateBadgeStyle {
  const curated = TEMPLATE_BADGE_STYLES[templateType];
  if (curated) return curated;
  // Custom (or any unknown) type: derive a stable colour from its public name so
  // each distinct custom VMR gets its own consistent colour. A fixed palette
  // can't guarantee uniqueness for unbounded names, but distinct names almost
  // always land on distinct colours.
  const key = (
    templateType === "custom" ? customTitle?.trim() || "custom" : templateType
  ).toLowerCase();
  return AUTO_PALETTE[hashString(key) % AUTO_PALETTE.length];
}
