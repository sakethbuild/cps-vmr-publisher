"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { SubmissionStatus, TemplateType } from "@prisma/client";

import { PeoplePreview } from "@/components/people-preview";
import { StatusBadge, formatStatusLabel } from "@/components/status-badge";
import { WordPressPreview } from "@/components/wordpress-preview";
import {
  ALLOWED_UPLOAD_LABELS,
  PERSON_LINK_TYPE_OPTIONS,
  SUBMISSION_STATUS_OPTIONS,
  TEMPLATE_TYPE_OPTIONS,
} from "@/lib/constants";
import { buildLinkedPeople, renderLinkedPeopleText } from "@/lib/preview";
import { emptyPerson, type SubmissionFormState } from "@/lib/submission-form";
import type { PersonInput } from "@/lib/submission-types";
import { generateSubmissionTitle } from "@/lib/templates";
import { cn } from "@/lib/ui";

const INPUT_CLASSNAME =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const TEXTAREA_CLASSNAME = `${INPUT_CLASSNAME} min-h-28 resize-y`;

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
  wordpressUrl,
  wordpressPageId,
  submissionId,
}: {
  initialState: SubmissionFormState;
  mode: "create" | "edit";
  uploadUrl?: string | null;
  previewImageUrl?: string | null;
  wordpressUrl?: string | null;
  wordpressPageId?: string | null;
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

  const presentersPreview = buildLinkedPeople(state.presenters);
  const discussantsPreview = buildLinkedPeople(state.discussants);
  const titlePreview = getTitlePreview(state);
  const requiresYoutube = ["standard", "raphael_medina_subspecialty", "img_vmr"].includes(
    state.templateType,
  );
  const hasUpload = Boolean(selectedFile?.name || state.existingFileName);

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

        if (mode === "edit" && state.manualStatus) {
          formData.append("manualStatus", state.manualStatus);
        }

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
        };

        if (!response.ok) {
          setFeedback({
            tone: "error",
            message: result.error ?? "Action could not be completed.",
          });
          return;
        }

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
          manualStatus: result.status ?? current.manualStatus,
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
                  : "Edit submission details"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                This internal prototype stores uploads locally, prepares the title,
                and keeps the final WordPress preview text visible as you work.
              </p>
            </div>

            {mode === "edit" && state.manualStatus ? (
              <StatusBadge status={state.manualStatus} />
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
                Template type
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
                Chief complaint
              </span>
              <input
                value={state.chiefComplaint}
                onChange={(event) =>
                  setState({ ...state, chiefComplaint: event.target.value })
                }
                className={INPUT_CLASSNAME}
                placeholder="e.g. progressive dyspnea, chest pain, syncope"
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
                placeholder="Optional until ready for draft where required"
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
                placeholder="Internal notes. For Sunday Fundamentals this also powers the simple text block under the image."
              />
            </label>

            {mode === "edit" ? (
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-800">
                  Status override
                </span>
                <select
                  value={state.manualStatus ?? "submitted"}
                  onChange={(event) =>
                    setState({
                      ...state,
                      manualStatus: event.target.value as SubmissionStatus,
                    })
                  }
                  className={INPUT_CLASSNAME}
                >
                  {SUBMISSION_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatStatusLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

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
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={() =>
                    runAction(
                      `/api/submissions/${state.id}/mark-ready`,
                      "Submission marked ready.",
                    )
                  }
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark ready
                </button>
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={() =>
                    runAction(
                      `/api/submissions/${state.id}/create-draft`,
                      "Mock WordPress draft created.",
                    )
                  }
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Create WordPress Draft
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
                <StatusBadge status={state.manualStatus ?? "submitted"} />
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
            </div>
          </div>

          {mode === "edit" && submissionId ? (
            <div className="rounded-[2rem] border border-amber-200 bg-[linear-gradient(135deg,#fff8eb,white)] p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                YouTube workflow
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Use this quick action to add or update the YouTube URL and let the
                status refresh automatically.
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
                Generated PNG preview prepared for later WordPress image publishing.
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

        <WordPressPreview
          templateType={state.templateType}
          presenters={presentersPreview}
          discussants={discussantsPreview}
          fileUrl={uploadUrl}
          previewImageUrl={previewImageUrl}
          notes={state.notes}
          title={titlePreview}
        />

        {mode === "edit" ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              WordPress draft state
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Draft page ID:</span>{" "}
                {wordpressPageId ?? "Not created yet"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Draft URL:</span>{" "}
                {wordpressUrl ? (
                  <a
                    href={wordpressUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-3"
                  >
                    Open draft
                  </a>
                ) : (
                  "Not created yet"
                )}
              </p>
            </div>
          </section>
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
            Add names one row at a time. Handles automatically turn into the right public links.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...people, emptyPerson()])}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
        >
          {addLabel}
        </button>
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
                  {option}
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
              placeholder="@handle or full URL"
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
      </div>
    </div>
  );
}
