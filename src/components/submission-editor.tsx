"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import type { SubmissionStatus, TemplateType } from "@prisma/client";

import { PeoplePreview } from "@/components/people-preview";
import { StatusBadge } from "@/components/status-badge";
import { SubmissionPublicView } from "@/components/submission-public-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  PERSON_LINK_TYPE_OPTIONS,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_TYPE_OPTIONS,
  TEMPLATE_UPLOAD_RULES,
} from "@/lib/constants";
import { formatDisplayDate } from "@/lib/dates";
import { buildLinkedPeople } from "@/lib/preview";
import { emptyPerson, type SubmissionFormState } from "@/lib/submission-form";
import type { PersonInput } from "@/lib/submission-types";
import { generateSubmissionTitle } from "@/lib/templates";
import { cn } from "@/lib/ui";

const ACCEPT_EXTENSIONS = ALLOWED_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(",");

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const PERSON_LINK_TYPE_LABELS: Record<(typeof PERSON_LINK_TYPE_OPTIONS)[number], string> = {
  none: "No link",
  x: "X (Twitter)",
  instagram: "Instagram",
  custom: "Custom URL",
};

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

type UploadPhase =
  | { kind: "idle" }
  | { kind: "preparing"; fileName: string; size: number }
  | { kind: "uploading"; fileName: string; size: number; loaded: number }
  | { kind: "confirming"; fileName: string; size: number }
  | { kind: "error"; message: string };

type PresignedUpload = {
  uploadUrl: string;
  publicUrl: string;
  storageKey: string;
  sanitizedFileName: string;
  fileExtension: string;
  fileMimeType: string;
  originalFileName: string;
  expiresInSeconds: number;
};

async function putWithProgress(params: {
  url: string;
  file: File;
  contentType: string;
  onProgress: (loaded: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", params.url);
    xhr.setRequestHeader("Content-Type", params.contentType);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) params.onProgress(event.loaded);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted.")));
    xhr.send(params.file);
  });
}

export function SubmissionEditor({
  initialState,
  mode,
  pdfUrl,
  thumbnailUrl,
  originalFileName,
  publicUrl,
  submissionId,
  userRole = "super_admin",
}: {
  initialState: SubmissionFormState;
  mode: "create" | "edit";
  pdfUrl?: string | null;
  thumbnailUrl?: string | null;
  originalFileName?: string | null;
  publicUrl?: string | null;
  submissionId?: string;
  userRole?: "member" | "super_admin" | null;
}) {
  const isSuperAdmin = userRole === "super_admin";
  // Members can edit unpublished submissions, but a published VMR is locked
  // down to super admins only. Use this everywhere the UI exposes a control
  // that would mutate state — file inputs, replace button, YouTube save,
  // etc. — so members don't see clickable controls that the backend will
  // reject (the backend gates the same routes).
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>({ kind: "idle" });
  const [youtubeDraftValue, setYoutubeDraftValue] = useState(initialState.youtubeUrl ?? "");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (feedback?.tone === "error") {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [feedback]);
  // After a successful Replace PDF, the server re-renders this page with a
  // fresh initialState. useState only takes initialState on mount, so the
  // "Current file" label would otherwise stay stale. Sync the server-derived
  // existingFileName whenever it changes (does not stomp on user edits to
  // other fields).
  useEffect(() => {
    setState((prev) => ({ ...prev, existingFileName: initialState.existingFileName }));
  }, [initialState.existingFileName]);
  const [isPending, startTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const [isYoutubePending, startYoutubeTransition] = useTransition();
  const [isCopyPending, startCopyTransition] = useTransition();

  const presentersPreview = buildLinkedPeople(state.presenters);
  const discussantsPreview = buildLinkedPeople(state.discussants);
  const titlePreview = getTitlePreview(state);
  const uploadRule = TEMPLATE_UPLOAD_RULES[state.templateType];
  const sessionDateLabel = state.sessionDate
    ? formatDisplayDate(state.sessionDate)
    : null;
  const currentStatus = state.currentStatus ?? "submitted";
  const isPublished = currentStatus === "published";
  const canEditFiles = !isPublished || isSuperAdmin;
  const isUploadBusy =
    uploadPhase.kind === "preparing" ||
    uploadPhase.kind === "uploading" ||
    uploadPhase.kind === "confirming";

  function validateLocalFile(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as never)) {
      return "Pick a PDF file. Other formats aren't supported — export your slides as PDF from PowerPoint or Keynote.";
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return `That file is ${formatBytes(file.size)} — larger than the ${formatBytes(MAX_UPLOAD_BYTES)} limit. Re-export at a lower resolution or compress before uploading.`;
    }
    if (file.size === 0) {
      return "That file is empty. Pick a non-empty PDF.";
    }
    return null;
  }

  async function uploadFileForSubmission(params: {
    file: File;
    submissionId: string;
    presigned: PresignedUpload;
  }) {
    setUploadPhase({
      kind: "uploading",
      fileName: params.file.name,
      size: params.file.size,
      loaded: 0,
    });

    // Upload ONLY the PDF to R2 via the presigned URL. The preview thumbnail
    // is generated server-side at confirm-upload (from this same PDF, via
    // mupdf), so the client never renders or uploads a thumbnail. This is the
    // fix for the silent client-render failures that left most uploads with
    // no preview.
    const putPdf = (onProgress: (loaded: number) => void) =>
      putWithProgress({
        url: params.presigned.uploadUrl,
        file: params.file,
        contentType: params.presigned.fileMimeType,
        onProgress,
      });
    const reportProgress = (loaded: number) =>
      setUploadPhase({
        kind: "uploading",
        fileName: params.file.name,
        size: params.file.size,
        loaded,
      });

    try {
      await putPdf(reportProgress);
    } catch {
      // One retry on transient network failure.
      try {
        await putPdf(reportProgress);
      } catch (retryError) {
        throw new Error(
          retryError instanceof Error
            ? `Upload interrupted: ${retryError.message}. Check your connection and try again.`
            : "Upload interrupted. Check your connection and try again.",
        );
      }
    }

    setUploadPhase({
      kind: "confirming",
      fileName: params.file.name,
      size: params.file.size,
    });

    const confirmResponse = await fetch(
      `/api/submissions/${params.submissionId}/confirm-upload`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicUrl: params.presigned.publicUrl,
          storageKey: params.presigned.storageKey,
          sanitizedFileName: params.presigned.sanitizedFileName,
          fileExtension: params.presigned.fileExtension,
          fileMimeType: params.presigned.fileMimeType,
          originalFileName: params.presigned.originalFileName,
        }),
      },
    );
    const confirmResult = (await confirmResponse.json()) as {
      ok?: boolean;
      status?: SubmissionStatus;
      error?: string;
    };

    if (!confirmResponse.ok || !confirmResult.ok) {
      throw new Error(
        confirmResult.error ??
          "We couldn't verify that the upload is a valid PDF. Please try again.",
      );
    }

    return confirmResult.status;
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (selectedFile) {
      const localError = validateLocalFile(selectedFile);
      if (localError) {
        setUploadPhase({ kind: "error", message: localError });
        return;
      }
    }

    startTransition(() => {
      void (async () => {
        try {
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

          if (mode === "create" && selectedFile) {
            formData.append("uploadFileName", selectedFile.name);
            formData.append("uploadMimeType", selectedFile.type ?? "");
            setUploadPhase({
              kind: "preparing",
              fileName: selectedFile.name,
              size: selectedFile.size,
            });
          }

          const endpoint =
            mode === "create" ? "/api/submissions" : `/api/submissions/${state.id}`;
          const method = mode === "create" ? "POST" : "PATCH";
          const response = await fetch(endpoint, { method, body: formData });
          const result = (await response.json()) as {
            id?: string;
            status?: SubmissionStatus;
            message?: string;
            error?: string;
            presignedUpload?: PresignedUpload | null;
          };

          if (!response.ok) {
            setUploadPhase({ kind: "idle" });
            setFeedback({
              tone: "error",
              message: result.error ?? "Something went wrong while saving.",
            });
            return;
          }

          let finalStatus = result.status ?? currentStatus;
          if (mode === "create" && selectedFile && result.id && result.presignedUpload) {
            try {
              const confirmedStatus = await uploadFileForSubmission({
                file: selectedFile,
                submissionId: result.id,
                presigned: result.presignedUpload,
              });
              if (confirmedStatus) finalStatus = confirmedStatus;
              setUploadPhase({ kind: "idle" });
            } catch (uploadError) {
              setUploadPhase({
                kind: "error",
                message:
                  uploadError instanceof Error
                    ? uploadError.message
                    : "Upload failed. Please try again.",
              });
              await fetch(`/api/submissions/${result.id}`, { method: "DELETE" }).catch(
                () => {},
              );
              return;
            }
          }

          setState((c) => ({ ...c, currentStatus: finalStatus }));
          setFeedback({
            tone: "success",
            message:
              result.message ?? (mode === "create" ? "Submission saved." : "Submission updated."),
          });

          if (mode === "create" && result.id) {
            router.push(`/admin/submissions/${result.id}`);
            return;
          }

          setSelectedFile(null);
          setYoutubeDraftValue(state.youtubeUrl ?? "");
          router.refresh();
        } catch (error) {
          setUploadPhase({ kind: "idle" });
          setFeedback({
            tone: "error",
            message: error instanceof Error ? error.message : "Unexpected error.",
          });
        }
      })();
    });
  }

  async function replaceImage(file: File) {
    if (mode !== "edit" || !submissionId) return;
    const localError = validateLocalFile(file);
    if (localError) {
      setUploadPhase({ kind: "error", message: localError });
      return;
    }

    setFeedback(null);
    setUploadPhase({
      kind: "preparing",
      fileName: file.name,
      size: file.size,
    });

    try {
      const presignResponse = await fetch(
        `/api/submissions/${submissionId}/presign-upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalFileName: file.name,
            declaredMimeType: file.type ?? null,
          }),
        },
      );
      const presigned = (await presignResponse.json()) as PresignedUpload & {
        error?: string;
      };
      if (!presignResponse.ok || presigned.error) {
        throw new Error(presigned.error ?? "Could not prepare upload.");
      }

      await uploadFileForSubmission({
        file,
        submissionId,
        presigned,
      });
      setUploadPhase({ kind: "idle" });
      setSelectedFile(null);
      setFeedback({ tone: "success", message: "PDF replaced." });
      router.refresh();
    } catch (error) {
      setUploadPhase({
        kind: "error",
        message: error instanceof Error ? error.message : "Replace failed.",
      });
    }
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
        setState((c) => ({
          ...c,
          youtubeUrl: result.youtubeUrl ?? "",
          currentStatus: result.status ?? c.currentStatus,
        }));
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

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      if (mode === "edit" && submissionId) {
        void replaceImage(file);
      } else {
        setUploadPhase({ kind: "idle" });
        setSelectedFile(file);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, submissionId],
  );

  function handleFilePicked(file: File | null) {
    if (!file) return;
    if (mode === "edit" && submissionId) {
      void replaceImage(file);
    } else {
      setUploadPhase({ kind: "idle" });
      setSelectedFile(file);
    }
  }

  const uploadProgressPercent =
    uploadPhase.kind === "uploading"
      ? Math.round((uploadPhase.loaded / Math.max(1, uploadPhase.size)) * 100)
      : uploadPhase.kind === "confirming"
        ? 100
        : 0;

  return (
    <div className={cn("grid gap-6", mode === "edit" && "xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]")}>
      <form className="space-y-5" onSubmit={submitForm}>
        {feedback && (
          <div
            ref={feedbackRef}
            role={feedback.tone === "error" ? "alert" : "status"}
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

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            {mode === "create" ? "Submit a VMR" : "Edit submission"}
          </h2>
          {mode === "edit" && <StatusBadge status={currentStatus} />}
        </div>

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

        <Card>
          <SectionLabel>PDF upload</SectionLabel>
          {!canEditFiles ? (
            <div className="rounded-lg border border-border-default bg-surface-tertiary p-4 text-sm text-text-muted">
              {state.existingFileName ? (
                <>
                  Current file: <span className="font-medium text-text-primary">{state.existingFileName}</span>
                  <p className="mt-2 text-xs">
                    This VMR is published. Only a super admin can replace its PDF.
                  </p>
                </>
              ) : (
                <p className="text-xs">No PDF uploaded yet.</p>
              )}
            </div>
          ) : uploadPhase.kind === "uploading" || uploadPhase.kind === "preparing" || uploadPhase.kind === "confirming" ? (
            <div className="rounded-lg border border-border-default bg-surface-tertiary p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-text-primary">
                  {uploadPhase.fileName}
                </span>
                <span className="text-xs text-text-muted">
                  {uploadPhase.kind === "preparing" && "Preparing..."}
                  {uploadPhase.kind === "uploading" &&
                    `${formatBytes(uploadPhase.loaded)} of ${formatBytes(uploadPhase.size)}`}
                  {uploadPhase.kind === "confirming" &&
                    "Generating preview image..."}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={uploadProgressPercent}
                  label={`Uploading ${uploadPhase.fileName}`}
                />
              </div>
            </div>
          ) : uploadPhase.kind === "error" ? (
            <div
              role="alert"
              className="rounded-lg border border-status-danger/30 bg-status-danger-muted p-4 text-sm text-status-danger"
            >
              <p className="font-medium">{uploadPhase.message}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setUploadPhase({ kind: "idle" });
                  setSelectedFile(null);
                }}
                className="mt-3"
              >
                Re-select file
              </Button>
            </div>
          ) : (
            <>
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
                  <svg className="mx-auto h-8 w-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <label className="block cursor-pointer">
                    <span className="text-sm text-text-secondary">
                      <span className="hidden md:inline">Drag and drop or </span>
                      <span className="font-medium text-accent hover:text-accent-hover">
                        <span className="hidden md:inline">browse files</span>
                        <span className="md:hidden">Tap to select a PDF</span>
                      </span>
                    </span>
                    <input
                      type="file"
                      accept={ACCEPT_EXTENSIONS}
                      required={mode === "create" && uploadRule.required}
                      onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
                      className="sr-only"
                      aria-describedby="upload-helper-text"
                    />
                  </label>
                  <p className="text-xs text-text-muted">{uploadRule.label} · max {formatBytes(MAX_UPLOAD_BYTES)}</p>
                </div>
              </div>
              <p id="upload-helper-text" className="mt-2 text-xs text-text-muted">
                Your PDF uploads to secure storage when you click {mode === "create" ? "Submit VMR" : "Save changes"}. We auto-generate a preview image of the first page for the archive cards. Keep filling out the form while it transfers.
              </p>
              {state.existingFileName && !selectedFile && (
                <p className="mt-2 text-xs text-text-secondary">
                  Current file: <span className="font-medium">{state.existingFileName}</span>
                </p>
              )}
              {selectedFile && (
                <p className="mt-2 text-xs text-text-secondary">
                  Selected: <span className="font-medium">{selectedFile.name}</span> · {formatBytes(selectedFile.size)}
                </p>
              )}
            </>
          )}
        </Card>

        {mode === "edit" && isPublished && !isSuperAdmin && (
          <div
            role="status"
            className="rounded-lg border border-status-published/30 bg-status-published-muted px-4 py-3 text-sm text-status-published"
          >
            This VMR is live. Only a super admin can edit a published submission.
          </div>
        )}

        {mode === "edit" && isPublished && isSuperAdmin && (
          <div
            role="status"
            className="rounded-lg border border-status-warning/30 bg-status-warning-muted px-4 py-3 text-sm text-status-warning"
          >
            <p className="font-medium">You are editing a published VMR.</p>
            <p className="mt-1 text-xs">
              Changes save immediately to the live public page. Click <strong>Save changes</strong> after editing,
              or <strong>Unpublish</strong> first if you want to take it offline while you work on it.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={
              isPending ||
              isUploadBusy ||
              (mode === "edit" && isPublished && !isSuperAdmin)
            }
            size="lg"
          >
            {isPending || isUploadBusy
              ? uploadPhase.kind === "uploading"
                ? "Uploading..."
                : uploadPhase.kind === "confirming"
                  ? "Generating preview..."
                  : "Saving..."
              : mode === "create"
                ? "Submit VMR"
                : "Save changes"}
          </Button>

          {mode === "edit" && state.id && (
            <>
              {isSuperAdmin && !isPublished && (
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
              )}
              {isSuperAdmin && isPublished && (
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
              {!isSuperAdmin && currentStatus === "ready_to_publish" && (
                <span className="inline-flex items-center rounded-md bg-status-success-muted px-3 py-2 text-xs font-medium text-status-success">
                  Awaiting super-admin review
                </span>
              )}
              {!isSuperAdmin && isPublished && (
                <span className="inline-flex items-center rounded-md bg-status-published-muted px-3 py-2 text-xs font-medium text-status-published">
                  Published — only super admin can unpublish
                </span>
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
              {isSuperAdmin && (
                <Button
                  type="button"
                  variant="danger"
                  size="lg"
                  disabled={isActionPending}
                  onClick={deleteSubmission}
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </form>

      {mode === "edit" && (
        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          {submissionId && canEditFiles && (
            <Card>
              <SectionLabel>Replace PDF</SectionLabel>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => replaceInputRef.current?.click()}
              >
                Choose replacement
              </Button>
              <input
                ref={replaceInputRef}
                type="file"
                accept={ACCEPT_EXTENSIONS}
                onChange={(e) => {
                  handleFilePicked(e.target.files?.[0] ?? null);
                  // Reset so picking the same file twice in a row still fires onChange
                  e.target.value = "";
                }}
                className="sr-only"
              />
              <p className="mt-2 text-xs text-text-muted">
                Picking a new file replaces the current PDF immediately, regenerates the preview, and deletes the old files.
              </p>
            </Card>
          )}

          {submissionId && canEditFiles && (
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

          <Card>
            <SectionLabel>Preview</SectionLabel>
            <SubmissionPublicView
              templateType={state.templateType}
              title={titlePreview}
              sessionDateLabel={sessionDateLabel}
              chiefComplaint={state.chiefComplaint}
              presenters={presentersPreview}
              discussants={discussantsPreview}
              pdfUrl={pdfUrl}
              thumbnailUrl={thumbnailUrl}
              originalFileName={originalFileName}
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
