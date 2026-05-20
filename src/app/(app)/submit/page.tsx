import { SubmissionEditor } from "@/components/submission-editor";
import { requireUserOrRedirect } from "@/lib/auth";
import { createEmptySubmissionFormState } from "@/lib/submission-form";

export default async function SubmitPage() {
  const user = await requireUserOrRedirect();
  return (
    <SubmissionEditor
      mode="create"
      initialState={createEmptySubmissionFormState()}
      userRole={user.role}
    />
  );
}
