import { SubmissionEditor } from "@/components/submission-editor";
import { createEmptySubmissionFormState } from "@/lib/submission-form";

export default function SubmitPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
          Submission form
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Submit a new CPS VMR
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Complete the form once, preview the generated title and WordPress text
          block, and hand it off to the admin workflow for draft preparation.
        </p>
      </section>

      <SubmissionEditor
        mode="create"
        initialState={createEmptySubmissionFormState()}
      />
    </div>
  );
}
