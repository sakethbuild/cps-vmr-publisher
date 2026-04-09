"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { SubmissionStatus, TemplateType } from "@prisma/client";

import { PeoplePreview } from "@/components/people-preview";
import { StatusBadge } from "@/components/status-badge";
import { SubmissionPublicView } from "@/components/submission-public-view";
import {
  ALLOWED_UPLOAD_LABELS,
  PERSON_LINK_TYPE_OPTIONS,
  TEMPLATE_TYPE_OPTIONS,
} from "@/lib/constants";
import { formatDisplayDate } from "@/lib/dates";
import { buildWordPressLinkLabel } from "@/lib/public-pages";
import { buildLinkedPeople, renderLinkedPeopleText } from "@/lib/preview";
import { emptyPerson, type SubmissionFormState } from "@/lib/submission-form";
import type { PersonInput } from "@/lib/submission-types";
import { generateSubmissionTitle } from "@/lib/templates";
import { cn } from "@/lib/ui";

const INPUT_CLASSNAME =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const TEXTAREA_CLASSNAME = `${INPUT_CLASSNAME} min-h-28 resize-y`;

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
  if (templateType === "sunday_fundamentals") {
    return ".png,.jpg,.jpeg,.pdf";
  }

  return ".pdf";
}

function getTitlePreview(state: SubmissionFormState) {
  if (!state.sessionDate) {
    return "Select a date to preview the generated title.";
  }

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
  return people.map((person, currentIndex) =>
    currentIndex === index ? { ...person, [field]: value } : person,
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
          {
            method: mode === "create" ? "POST" : "PATCH",
            body: formData,
          },
        );

        const result = (await response.json()) as {
          id?: string;
          status?: SubmissionStatus;
          message?: string;
          error?: string;
        };

        if (!response.ok) {
          setFeedback({
            tone: "error",
            message: result.error ?? "Something went wrong while saving.",
          });
          return;
        }

        setState((current) => ({
          ...current,
          currentStatus: result.status ?? current.currentStatus,
        }));
        setFeedback({
          tone: "success",
          message:
            result.message ??
            (mode === "create"
              ? "Submission saved successfully."
              : "Submission updated successfully."),
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
          setFeedback({
            tone: "error",
            message: result.error ?? "Action could not be completed.",
          });
          return;
        }

        setState((current) => ({
          ...current,
          currentStatus: result.status ?? current.currentStatus,
        }));
        setFeedback({
          tone: "success",
          message: result.message ?? successMessage,
        });
        router.refresh();
      })();
    });
  }

  async function updateYoutubeUrl() {
    if (!submissionId) {
      return;
    }

    setFeedback(null);

    startYoutubeTransition(() => {
      void (async () => {
        const response = await fetch(`/api/submissions/${submissionId}/youtube`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            youtubeUrl: youtubeDraftValue,
          }),
        });

        const result = (await response.json()) as {
          error?: string;
          message?: string;
          status?: SubmissionStatus;
          youtubeUrl?: string | null;
        };

        if (!response.ok) {
          setFeedback({
            tone: "error",
            message: result.error ?? "YouTube URL could not be updated.",
          });
          return;
        }

        setState((current) => ({
          ...current,
          youtubeUrl: result.youtubeUrl ?? "",
          currentStatus: result.status ?? current.currentStatus,
        }));
        setYoutubeDraftValue(result.youtubeUrl ?? "");
        setFeedback({
          tone: "success",
          message: result.message ?? "YouTube URL updated.",
        });
        router.refresh();
      })();
    });
  }

  async function copyPublicUrl() {
    if (!publicUrl) {
      setFeedback({
        tone: "error",
        message: "Publish this submission first to generate its public URL.",
      });
      return;
    }

    startCopyTransition(() => {
      void (async () => {
        try {
          await navigator.clipboard.writeText(publicUrl);
          setFeedback({
            tone: "success",
            message: "Public URL copied.",
          });
        } catch {
          setFeedback({
            tone: "error",
            message: "The URL could not be copied automatically.",
          });
        }
      })();
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
      <form className="space-y-8" onSubmit={submitForm}>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                {mode === "create" ? "New submission" : "Admin editor"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {mode === "create"
                  ? "Capture a new VMR submission"
                  : "Review and publish this VMR"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                This internal workflow keeps the CPS team’s review process in one
                place, then turns approved entries into live public pages.
              </p>
            </div>

            {mode === "edit" ? (
              <StatusBadge status={currentStatus} />
            ) : null}
          </div>

          {feedback ? (
            <div
              className={cn(
                "mt-6 rounded-2xl border px-4 py-3 text-sm",
                feedback.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800",
              )}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">
                Type of VMR
              </span>
              <select
                value={state.templateType}
                onChange={(event) =>
                  setState({ ...state, templateType: event.target.value as TemplateType })
                }
                className={INPUT_CLASSNAME}
              >
                {TEMPLATE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Session date</span>
              <input
                type="date"
                required
                value={state.sessionDate}
                onChange={(event) =>
                  setState({ ...state, sessionDate: event.target.value })
                }
                className={INPUT_CLASSNAME}
              />
            </label>

            {state.templateType === "raphael_medina_subspecialty" ? (
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-800">
                  Subspecialty
                </span>
                <input
                  required
                  value={state.subspecialty}
                  onChange={(event) =>
                    setState({ ...state, subspecialty: event.target.value })
                  }
                  className={INPUT_CLASSNAME}
                  placeholder="Cardiology, Nephrology, Rheumatology..."
                />
              </label>
            ) : null}

            {state.templateType === "img_vmr" ? (
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-800">
                  Residency program
                </span>
                <input
                  required
                  value={state.residencyProgram}
                  onChange={(event) =>
                    setState({ ...state, residencyProgram: event.target.value })
                  }
                  className={INPUT_CLASSNAME}
                  placeholder="Residency program name"
                />
              </label>
            ) : null}

            {state.templateType === "custom" ? (
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-800">
                  Custom title
                </span>
                <input
                  required
                  value={state.customTitle}
                  onChange={(event) =>
                    setState({ ...state, customTitle: event.target.value })
                  }
                  className={INPUT_CLASSNAME}
                  placeholder="Enter the exact title to use"
                />
              </label>
            ) : null}

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-800">
                Chief Concern
              </span>
              <input
                value={state.chiefComplaint}
                onChange={(event) =>
                  setState({ ...state, chiefComplaint: event.target.value })
                }
                onBlur={(event) =>
                  setState((current) => ({
                    ...current,
                    chiefComplaint: toTitleCase(event.target.value),
                  }))
                }
                className={INPUT_CLASSNAME}
                placeholder="e.g. Progressive Dyspnea, Chest Pain, Syncope"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-800">
                YouTube URL
              </span>
              <input
                type="url"
                value={state.youtubeUrl}
                onChange={(event) =>
                  setState({ ...state, youtubeUrl: event.target.value })
                }
                className={INPUT_CLASSNAME}
                placeholder="Paste link if available"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-800">Notes</span>
              <textarea
                value={state.notes}
                onChange={(event) =>
                  setState({ ...state, notes: event.target.value })
                }
                className={TEXTAREA_CLASSNAME}
                placeholder="Public teaching points or supporting notes. Sunday Fundamentals uses this below the image."
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-800">
                Primary upload
              </span>
              <input
                type="file"
                accept={getAcceptValue(state.templateType)}
                required={mode === "create" && state.templateType !== "custom"}
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                className={cn(INPUT_CLASSNAME, "file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white")}
              />
              <p className="text-xs leading-6 text-slate-500">
                Allowed file types: {ALLOWED_UPLOAD_LABELS[state.templateType]}
              </p>
              {state.existingFileName && !selectedFile ? (
                <p className="text-xs leading-6 text-slate-500">
                  Current file: {state.existingFileName}
                </p>
              ) : null}
              {selectedFile ? (
                <p className="text-xs leading-6 text-slate-500">
                  New file selected: {selectedFile.name}
                </p>
              ) : null}
            </label>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
            <PeopleSection
              title="Presenters"
              addLabel="Add presenter"
              people={state.presenters}
              onChange={(people) => setState({ ...state, presenters: people })}
            />
          <div className="mt-8">
            <PeopleSection
              title="Discussants"
              addLabel="Add discussant"
              people={state.discussants}
              onChange={(people) => setState({ ...state, discussants: people })}
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPending
                ? "Saving..."
                : mode === "create"
                  ? "Submit VMR"
                  : "Save changes"}
            </button>

            {mode === "edit" && state.id ? (
              <>
                {!isPublished ? (
                  <button
                    type="button"
                    disabled={isActionPending}
                    onClick={() =>
                      runAction(
                        `/api/submissions/${state.id}/publish`,
                        "Submission published.",
                      )
                    }
                    className="rounded-full border border-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Publish Public Page
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isActionPending}
                    onClick={() =>
                      runAction(
                        `/api/submissions/${state.id}/unpublish`,
                        "Submission unpublished.",
                      )
                    }
                    className="rounded-full border border-amber-300 px-5 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Unpublish
                  </button>
                )}
                <button
                  type="button"
                  disabled={isCopyPending || !publicUrl}
                  onClick={copyPublicUrl}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Copy Public URL
                </button>
              </>
            ) : null}
          </div>
        </section>
      </form>

      <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Operations status
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Current workflow</span>
                <StatusBadge status={currentStatus} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Upload on file</span>
                <span className="font-semibold text-slate-900">
                  {hasUpload ? "Yes" : "Not yet"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">YouTube required</span>
                <span className="font-semibold text-slate-900">
                  {requiresYoutube ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Public page live</span>
                <span className="font-semibold text-slate-900">
                  {isPublished ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {mode === "edit" && submissionId ? (
            <div className="rounded-[2rem] border border-amber-200 bg-[linear-gradient(135deg,#fff8eb,white)] p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                YouTube workflow
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Add or update the YouTube link here. The publish status refreshes
                automatically.
              </p>
              <input
                type="url"
                value={youtubeDraftValue}
                onChange={(event) => setYoutubeDraftValue(event.target.value)}
                className="mt-4 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                placeholder="https://youtube.com/..."
              />
              <button
                type="button"
                onClick={updateYoutubeUrl}
                disabled={isYoutubePending}
                className="mt-4 w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
              >
                {isYoutubePending ? "Updating..." : "Add/Update YouTube URL"}
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#fff7ed,white_45%,#eff6ff)] p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Generated title preview
          </p>
          <p className="mt-3 text-xl font-semibold leading-8 text-slate-950">
            {titlePreview}
          </p>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Linked names preview
          </p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Presenters:</span>
            </p>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <PeoplePreview
                people={presentersPreview}
                emptyLabel="No presenters yet"
              />
            </div>
            <p>
              <span className="font-semibold text-slate-900">Discussants:</span>
            </p>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <PeoplePreview
                people={discussantsPreview}
                emptyLabel="No discussants yet"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Upload details
          </p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Current file:</span>{" "}
              {selectedFile?.name ?? state.existingFileName ?? "None yet"}
            </p>
            {state.templateType === "sunday_fundamentals" && previewImageUrl ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Generated PNG preview prepared for the public page and WordPress handoff.
              </div>
            ) : null}
            {uploadUrl ? (
              <a
                href={uploadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              >
                Open stored file
              </a>
            ) : null}
            {previewImageUrl ? (
              <Image
                src={previewImageUrl}
                alt="Preview upload"
                width={1200}
                height={900}
                className="w-full rounded-[1.5rem] border border-slate-200 object-cover"
                unoptimized
              />
            ) : null}
            <p className="text-xs leading-6 text-slate-500">
              Linked names preview text: {renderLinkedPeopleText(presentersPreview) || "No presenters"} /{" "}
              {renderLinkedPeopleText(discussantsPreview) || "No discussants"}
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
          <p className="px-2 pt-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Live public page preview
          </p>
          <div className="mt-3">
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
              className="shadow-none"
            />
          </div>
        </section>

        {mode === "edit" ? (
          <>
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                Public page status
              </p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Live URL:</span>{" "}
                  {publicUrl ? (
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-3"
                    >
                      Open public page
                    </a>
                  ) : (
                    "Publish this submission to generate its public page URL."
                  )}
                </p>
                <button
                  type="button"
                  disabled={isCopyPending || !publicUrl}
                  onClick={copyPublicUrl}
                  className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Copy Public URL
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                WordPress handoff
              </p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Suggested page title:</span>{" "}
                  {titlePreview}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Suggested link label:</span>{" "}
                  {buildWordPressLinkLabel(titlePreview)}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Public URL:</span>{" "}
                  {publicUrl ?? "Publish first to generate the final link."}
                </p>
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  In WordPress, create or update the matching CPS page title and add a
                  clear call-to-action link that points to this public VMR page.
                </p>
              </div>
            </section>
          </>
        ) : null}
      </aside>
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            {title}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Add names one row at a time.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {people.map((person, index) => (
          <div
            key={`${title}-${index}`}
            className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1.2fr)_180px_minmax(0,1fr)_auto]"
          >
            <input
              value={person.fullName}
              onChange={(event) =>
                onChange(updatePerson(people, index, "fullName", event.target.value))
              }
              className={INPUT_CLASSNAME}
              placeholder="Full name"
            />

            <select
              value={person.linkType}
              onChange={(event) =>
                onChange(updatePerson(people, index, "linkType", event.target.value))
              }
              className={INPUT_CLASSNAME}
            >
              {PERSON_LINK_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {PERSON_LINK_TYPE_LABELS[option]}
                </option>
              ))}
            </select>

            <input
              value={person.handleOrUrl ?? ""}
              onChange={(event) =>
                onChange(
                  updatePerson(people, index, "handleOrUrl", event.target.value),
                )
              }
              className={INPUT_CLASSNAME}
              placeholder="@handle or profile URL"
            />

            <button
              type="button"
              onClick={() =>
                onChange(
                  people.length === 1
                    ? [emptyPerson()]
                    : people.filter((_, currentIndex) => currentIndex !== index),
                )
              }
              className="rounded-full border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onChange([...people, emptyPerson()])}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
