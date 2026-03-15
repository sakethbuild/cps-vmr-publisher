import Image from "next/image";
import type { TemplateType } from "@prisma/client";

import type { LinkedPerson } from "@/lib/preview";
import { isStandardPreview } from "@/lib/preview";

import { PeoplePreview } from "@/components/people-preview";

export function WordPressPreview({
  templateType,
  presenters,
  discussants,
  fileUrl,
  previewImageUrl,
  notes,
  title,
}: {
  templateType: TemplateType;
  presenters: LinkedPerson[];
  discussants: LinkedPerson[];
  fileUrl?: string | null;
  previewImageUrl?: string | null;
  notes?: string | null;
  title: string;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Live WordPress preview
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{title}</h3>
      </div>

      {isStandardPreview(templateType) ? (
        <div className="space-y-4 text-sm leading-7 text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">Case Presenter:</span>{" "}
            <PeoplePreview people={presenters} emptyLabel="No presenters added yet." />
          </p>
          <p>
            <span className="font-semibold text-slate-900">Case Discussants:</span>{" "}
            <PeoplePreview
              people={discussants}
              emptyLabel="No discussants added yet."
            />
          </p>
          <p>
            <span className="font-semibold text-slate-900">
              Case Summary &amp; Teaching Points:
            </span>{" "}
            {fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-3"
              >
                Here
              </a>
            ) : (
              <span className="text-slate-400">Here</span>
            )}
          </p>
        </div>
      ) : null}

      {templateType === "sunday_fundamentals" ? (
        <div className="space-y-4">
          {previewImageUrl ? (
            <Image
              src={previewImageUrl}
              alt={`${title} preview`}
              width={1200}
              height={900}
              className="w-full rounded-[1.5rem] border border-slate-200 object-cover"
              unoptimized
            />
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Upload a PNG, JPG, JPEG, or PDF to preview the final image block.
            </div>
          )}
          <div className="rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
            {notes?.trim() || "Sunday Fundamentals text will appear here."}
          </div>
        </div>
      ) : null}

      {templateType === "custom" ? (
        <div className="space-y-4 text-sm leading-7 text-slate-700">
          <p className="font-semibold text-slate-900">Custom submission preview</p>
          <p>{notes?.trim() || "Optional custom notes will appear here."}</p>
          <p>
            Uploaded file:{" "}
            {fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-3"
              >
                Open file
              </a>
            ) : (
              <span className="text-slate-400">Not available yet</span>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
