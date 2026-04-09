import { SubmissionEditor } from "@/components/submission-editor";
import { createEmptySubmissionFormState } from "@/lib/submission-form";

export default function SubmitPage() {
  return (
    <SubmissionEditor
      mode="create"
      initialState={createEmptySubmissionFormState()}
    />
  );
}
