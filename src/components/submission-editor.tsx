"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import type { SubmissionStatus, TemplateType } from "@prisma/client";

import { PeoplePreview } from "@/components/people-preview";
import { StatusBadge } from "@/components/status-badge";
import { SubmissionPublicView } from "@/components/submission-public-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ALLOWED_UPLOAD_LABELS,
  PERSON_LINK_TYPE_OPTIONS,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_TYPE_OPTIONS,
} from "@/lib/constants";
import { formatDisplayDate } from "@/lib/dates";
import { buildWordPressLinkLabel } from "@/lib/public-pages";
import { buildLinkedPeople, renderLinkedPeopleText } from "@/lib/preview";
import { emptyPerson, type SubmissionFormState } from "@/lib/submission-form";
import type { PersonInput } from "@/lib/submission-types";
import { generateSubmissionTitle } from "@/lib/templates";
import { cn } from "@/lib/ui";

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

const PERSON_LINK_TYPE_LABELS: Record<(typeof PERSON_LINK_TYPE_OPTIONS)[number], string> = {
  none: "No link",
  x: "X (Twitter)",
  instagram: "Instagram",
  custom: "Custom URL",
};

function getAcceptValue(templateType: TemplateType) {
  if (templateType === "sunday_fundamentals") return ".png,.jpg,.jpeg,.pdf";
  return ".pdf";
}

function getTitlePreview(state: SubmissionFormState) {
  if (!state.sessionDate) return "Select a date to preview the generated title.";
  return generateSubmissionTitle({
    templateType: state.templateType,
    sessionDate: state.sessionDate,
    subspecialty: state.subspecialty,
    residencyProgram: state.residencyProgram,
    customTitle: state.customTitle,
    chiefComplaint: state.chiefComplaint,
  });
}

function updatePerson(
  people: PersonInput[],
  index: number,
  field: keyof PersonInput,
  value: string,
) {
  return people.map((person, i) =>
    i === index ? { ...person, [field]: value } : person,
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-4">
      {children}
    </h3>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-text-secondary">
      {children}
      {required && <span className="text-status-danger ml-0.5">*</span>}
    </span>
  );
}

export function SubmissionEditor({
  initialState,
  mode,
  uploadUrl,
  previewImageUrl,
  publicUrl,
  submissionId,
}: {
  initialState: SubmissionFormState;
  mode: "create" | "edit";
  uploadUrl?: string | null;
  previewImageUrl?: string | null;
  publicUrl?: string | null;
  submissionId?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [youtubeDraftValue, setYoutubeDraftValue] = useState(initialState.youtubeUrl ?? "");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const [isYoutubePending, startYoutubeTransition] = useTransition();
  const [isCopyPending, startCopyTransition] = useTransition();

  const presentersPreview = buildLinkedPeople(state.presenters);
  const discussantsPreview = buildLinkedPeople(state.discussants);
  const titlePreview = getTitlePreview(state);
  const requiresYoutube = ["standard", "raphael_medina_subspecialty", "img_vmr"].includes(
    state.templateType,
  );
  const hasUpload = Boolean(selectedFile?.name || state.existingFileName);
  const currentStatus = state.currentStatus ?? "submitted";
  const isPublished = currentStatus === "published";
  const sessionDateLabel = state.sessionDate
    ? formatDisplayDate(state.sessionDate)
    : null;

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(() => {
      void (async () => {
        const formData = new FormData();
        formData.append("templateType", state.templateType);
        formData.append("subspecialty", state.subspecialty ?? "");
        formData.append("residencyProgram", state.residencyProgram ?? "");
        formData.append("customTitle", state.customTitle ?? "");
        formData.append("sessionDate", state.sessionDate ?? "");
        formData.append("chiefComplaint", state.chiefComplaint ?? "");
        formData.append("youtubeUrl", state.youtubeUrl ?? "");
        formData.append("notes", state.notes ?? "");
        formData.append("presenters", JSON.stringify(state.presenters));
        formData.append("discussants", JSON.stringify(state.discussants));

        if (selectedFile) {
          formData.append("primaryUpload", selectedFile);
        }

        const response = await fetch(
          mode === "create" ? "/api/submissions" : `/api/submissions/${state.id}`,
          { method: mode === "create" ? "POST" : "PATCH", body: formData },
        );

        const result = (await response.json()) as {
          id?: string;
          status?: SubmissionStatus;
          message?: string;
          error?: string;
        };

        if (!response.ok) {
          setFeedback({ tone: "error", message: result.error ?? "Something went wrong while saving." });
          return;
        }

        setState((c) => ({ ...c, currentStatus: result.status ?? c.currentStatus }));
        setFeedback({
          tone: "success",
          message: result.message ?? (mode === "create" ? "Submission saved." : "Submission updated."),
        });

        if (mode === "create" && result.id) {
          router.push(`/admin/submissions/${result.id}`);
          return;
        }

        setSelectedFile(null);
        setYoutubeDraftValue(state.youtubeUrl ?? "");
        router.refresh();
      })();
    });
  }

  async function runAction(url: string, successMessage: string) {
    setFeedback(null);
    startActionTransition(() => {
      void (async () => {
        const response = await fetch(url, { method: "POST" });
        const result = (await response.json()) as {
          error?: string;
          message?: string;
          status?: SubmissionStatus;
        };
        if (!response.ok) {
          setFeedback({ tone: "error", message: result.error ?? "Action could not be completed." });
          return;
        }
        setState((c) => ({ ...c, currentStatus: result.status ?? c.currentStatus }));
        setFeedback({ tone: "success", message: result.message ?? successMessage });
        router.refresh();
      })();
    });
  }

  async function updateYoutubeUrl() {
    if (!submissionId) return;
    setFeedback(null);
    startYoutubeTransition(() => {
      void (async () => {
        const response = await fetch(`/api/submissions/${submissionId}/youtube`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ youtubeUrl: youtubeDraftValue }),
        });
        const result = (await response.json()) as {
          error?: string;
          message?: string;
          status?: SubmissionStatus;
          youtubeUrl?: string | null;
        };
        if (!response.ok) {
          setFeedback({ tone: "error", message: result.error ?? "YouTube URL could not be updated." });
          return;
        }
        setState((c) => ({ ...c, youtubeUrl: result.youtubeUrl ?? "", currentStatus: result.status ?? c.currentStatus }));
        setYoutubeDraftValue(result.youtubeUrl ?? "");
        setFeedback({ tone: "success", message: result.message ?? "YouTube URL updated." });
        router.refresh();
      })();
    });
  }

  async function copyPublicUrl() {
    if (!publicUrl) {
      setFeedback({ tone: "error", message: "Publish first to generate a public URL." });
      return;
    }
    startCopyTransition(() => {
      void (async () => {
        try {
          await navigator.clipboard.writeText(publicUrl);
          setFeedback({ tone: "success", message: "Public URL copied." });
        } catch {
          setFeedback({ tone: "error", message: "Could not copy URL automatically." });
        }
      })();
    });
  }

  async function deleteSubmission() {
    if (!submissionId) return;
    if (!window.confirm("Are you sure you want to delete this submission? This cannot be undone.")) return;
    setFeedback(null);
    startActionTransition(() => {
      void (async () => {
        const response = await fetch(`/api/submissions/${submissionId}`, { method: "DELETE" });
        const result = (await response.json()) as { error?: string; message?: string };
        if (!response.ok) {
          setFeedback({ tone: "error", message: result.error ?? "Could not delete submission." });
          return;
        }
        router.push("/admin");
      })();
    });
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  return (
    <div className={cn("grid gap-6", mode === "edit" && "xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]")}>
      <form className="space-y-5" onSubmit={submitForm}>

        {/* Feedback */}
        {feedback && (
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              feedback.tone === "success"
                ? "border-status-success/20 bg-status-success-muted text-status-success"
                : "border-status-danger/20 bg-status-danger-muted text-status-danger",
            )}
          >
            {feedback.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            {mode === "create" ? "Submit a VMR" : "Edit submission"}
          </h2>
          {mode === "edit" && <StatusBadge status={currentStatus} />}
        </div>

        {/* ── Session Info ── */}
        <Card>
          <SectionLabel>Session info</SectionLabel>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <FieldLabel required>Type of VMR</FieldLabel>
              <Select
                value={state.templateType}
                onChange={(e) => setState({ ...state, templateType: e.target.value as TemplateType })}
              >
                {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{TEMPLATE_TYPE_LABELS[opt] ?? opt}</option>
                ))}
              </Select>
            </label>

            <label className="space-y-1.5">
              <FieldLabel required>Session date</FieldLabel>
              <Input
                type="date"
                required
                value={state.sessionDate}
                onChange={(e) => setState({ ...state, sessionDate: e.target.value })}
              />
            </label>

            {state.templateType === "raphael_medina_subspecialty" && (
              <label className="space-y-1.5">
                <FieldLabel required>Subspecialty</FieldLabel>
                <Input
                  required
                  value={state.subspecialty}
                  onChange={(e) => setState({ ...state, subspecialty: e.target.value })}
                  placeholder="Cardiology, Nephrology..."
                />
              </label>
            )}

            {state.templateType === "img_vmr" && (
              <label className="space-y-1.5">
                <FieldLabel required>Residency program</FieldLabel>
                <Input
                  required
                  value={state.residencyProgram}
                  onChange={(e) => setState({ ...state, residencyProgram: e.target.value })}
                  placeholder="Residency program name"
                />
              </label>
            )}

            {state.templateType === "custom" && (
              <label className="space-y-1.5 md:col-span-2">
                <FieldLabel required>Custom title</FieldLabel>
                <Input
                  required
                  value={state.customTitle}
                  onChange={(e) => setState({ ...state, customTitle: e.target.value })}
                  placeholder="Enter the exact title to use"
                />
              </label>
            )}
          </div>
        </Card>

        {/* ── Case Details ── */}
        <Card>
          <SectionLabel>Case details</SectionLabel>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <FieldLabel>Chief Concern</FieldLabel>
              <Input
                value={state.chiefComplaint}
                onChange={(e) => setState({ ...state, chiefComplaint: e.target.value })}
                onBlur={(e) => setState((c) => ({ ...c, chiefComplaint: toTitleCase(e.target.value) }))}
                placeholder="e.g. Progressive Dyspnea, Chest Pain"
              />
            </label>

            <label className="block space-y-1.5">
              <FieldLabel>YouTube URL</FieldLabel>
              <Input
                type="url"
                value={state.youtubeUrl}
                onChange={(e) => setState({ ...state, youtubeUrl: e.target.value })}
                placeholder="Paste link if available"
              />
            </label>

            <label className="block space-y-1.5">
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                value={state.notes}
                onChange={(e) => setState({ ...state, notes: e.target.value })}
                placeholder="Teaching points or supporting notes"
              />
            </label>
          </div>
        </Card>

        {/* ── People ── */}
        <Card>
          <PeopleSection
            title="Presenters"
            addLabel="Add presenter"
            people={state.presenters}
            onChange={(people) => setState({ ...state, presenters: people })}
          />
          <div className="mt-6 pt-6 border-t border-border-default">
            <PeopleSection
              title="Discussants"
              addLabel="Add discussant"
              people={state.discussants}
              onChange={(people) => setState({ ...state, discussants: people })}
            />
          </div>
        </Card>

        {/* ── Upload ── */}
        <Card>
          <SectionLabel>File upload</SectionLabel>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "relative rounded-lg border-2 border-dashed p-6 text-center transition-colors",
              dragActive
                ? "border-accent bg-accent-muted"
                : "border-border-default hover:border-border-strong",
            )}
          >
            <div className="space-y-2">
              <svg className="mx-auto h-8 w-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm text-text-secondary">
                Drag and drop or{" "}
                <label className="cursor-pointer font-medium text-accent hover:text-accent-hover">
                  browse files
                  <input
                    type="file"
                    accept={getAcceptValue(state.templateType)}
                    required={mode === "create" && state.templateType !== "custom"}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
              </p>
              <p className="text-xs text-text-muted">
                {ALLOWED_UPLOAD_LABELS[state.templateType]}
              </p>
            </div>
          </div>
          {state.existingFileName && !selectedFile && (
            <p className="mt-2 text-xs text-text-secondary">
              Current file: <span className="font-medium">{state.existingFileName}</span>
            </p>
          )}
          {selectedFile && (
            <p className="mt-2 text-xs text-text-secondary">
              Selected: <span className="font-medium">{selectedFile.name}</span>
            </p>
          )}
        </Card>

        {/* ── Actions ── */}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? "Saving..." : mode === "create" ? "Submit VMR" : "Save changes"}
          </Button>

          {mode === "edit" && state.id && (
            <>
              {!isPublished ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={isActionPending}
                  onClick={() => runAction(`/api/submissions/${state.id}/publish`, "Published.")}
                  className="border-status-success/30 text-status-success hover:bg-status-success-muted"
                >
                  Publish
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={isActionPending}
                  onClick={() => runAction(`/api/submissions/${state.id}/unpublish`, "Unpublished.")}
                  className="border-status-warning/30 text-status-warning hover:bg-status-warning-muted"
                >
                  Unpublish
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="lg"
                disabled={isCopyPending || !publicUrl}
                onClick={copyPublicUrl}
              >
                Copy URL
              </Button>
              <Button
                type="button"
                variant="danger"
                size="lg"
                disabled={isActionPending}
                onClick={deleteSubmission}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </form>

      {/* ── Sidebar (edit mode only) ── */}
      {mode === "edit" && (
        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          {/* YouTube URL quick-edit */}
          {submissionId && (
            <Card>
              <SectionLabel>YouTube URL</SectionLabel>
              <Input
                type="url"
                value={youtubeDraftValue}
                onChange={(e) => setYoutubeDraftValue(e.target.value)}
                placeholder="https://youtube.com/..."
              />
              <Button
                type="button"
                size="sm"
                onClick={updateYoutubeUrl}
                disabled={isYoutubePending}
                className="mt-3 w-full"
              >
                {isYoutubePending ? "Updating..." : "Save YouTube URL"}
              </Button>
            </Card>
          )}

          {/* Public URL */}
          {publicUrl && (
            <Card>
              <SectionLabel>Live URL</SectionLabel>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium text-accent hover:text-accent-hover"
              >
                {publicUrl}
              </a>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isCopyPending}
                onClick={copyPublicUrl}
                className="mt-3 w-full"
              >
                Copy URL
              </Button>
            </Card>
          )}

          {/* Preview */}
          <Card>
            <SectionLabel>Preview</SectionLabel>
            <SubmissionPublicView
              templateType={state.templateType}
              title={titlePreview}
              sessionDateLabel={sessionDateLabel}
              chiefComplaint={state.chiefComplaint}
              presenters={presentersPreview}
              discussants={discussantsPreview}
              fileUrl={uploadUrl}
              previewImageUrl={previewImageUrl}
              notes={state.notes}
              youtubeUrl={state.youtubeUrl}
              className="shadow-none border-0 p-0"
            />
          </Card>
        </aside>
      )}
    </div>
  );
}

function PeopleSection({
  title,
  addLabel,
  people,
  onChange,
}: {
  title: string;
  addLabel: string;
  people: PersonInput[];
  onChange: (people: PersonInput[]) => void;
}) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="space-y-3">
        {people.map((person, index) => (
          <div
            key={`${title}-${index}`}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-tertiary p-3 md:flex-nowrap"
          >
            <Input
              value={person.fullName}
              onChange={(e) => onChange(updatePerson(people, index, "fullName", e.target.value))}
              placeholder="Full name"
              className="flex-1 min-w-[140px]"
            />
            <Select
              value={person.linkType}
              onChange={(e) => onChange(updatePerson(people, index, "linkType", e.target.value))}
              className="w-auto min-w-[140px]"
            >
              {PERSON_LINK_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{PERSON_LINK_TYPE_LABELS[opt]}</option>
              ))}
            </Select>
            <Input
              value={person.handleOrUrl ?? ""}
              onChange={(e) => onChange(updatePerson(people, index, "handleOrUrl", e.target.value))}
              placeholder="@handle or URL"
              className="flex-1 min-w-[140px]"
            />
            <button
              type="button"
              onClick={() =>
                onChange(
                  people.length === 1
                    ? [emptyPerson()]
                    : people.filter((_, i) => i !== index),
                )
              }
              className="shrink-0 rounded-lg p-2 text-text-muted hover:bg-status-danger-muted hover:text-status-danger transition-colors"
              aria-label="Remove"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange([...people, emptyPerson()])}
        className="mt-3"
      >
        + {addLabel}
      </Button>
    </div>
  );
}
