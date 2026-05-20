// Negative path: ensure a non-PNG payload disguised as .png is rejected by confirm-upload
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = process.env.APP_BASE_URL ?? "http://localhost:3000";

async function main() {
  const fakePath = join(tmpdir(), `fake-${Date.now()}.png`);
  writeFileSync(fakePath, "this is not actually a PNG, just text");
  const fakeBuffer = readFileSync(fakePath);

  const formData = new FormData();
  formData.append("templateType", "custom");
  formData.append("sessionDate", "2026-05-20");
  formData.append("customTitle", "Rejection smoke test");
  formData.append("chiefComplaint", "");
  formData.append("youtubeUrl", "");
  formData.append("notes", "");
  formData.append(
    "presenters",
    JSON.stringify([{ fullName: "Tester", linkType: "none", handleOrUrl: "" }]),
  );
  formData.append(
    "discussants",
    JSON.stringify([{ fullName: "Reviewer", linkType: "none", handleOrUrl: "" }]),
  );
  formData.append("uploadFileName", "fake.png");
  formData.append("uploadMimeType", "image/png");

  const createResponse = await fetch(`${APP}/api/submissions`, {
    method: "POST",
    body: formData,
  });
  const createBody = await createResponse.json();
  if (!createResponse.ok || !createBody.presignedUpload) {
    console.error("create step failed", createBody);
    process.exit(1);
  }

  const { presignedUpload, id } = createBody;
  console.log(`[1] Created submission ${id}`);

  const putResponse = await fetch(presignedUpload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": presignedUpload.fileMimeType },
    body: fakeBuffer,
  });
  console.log(`[2] PUT to R2: ${putResponse.status}`);

  const confirmResponse = await fetch(
    `${APP}/api/submissions/${id}/confirm-upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicUrl: presignedUpload.publicUrl,
        storageKey: presignedUpload.storageKey,
        sanitizedFileName: presignedUpload.sanitizedFileName,
        fileExtension: presignedUpload.fileExtension,
        fileMimeType: presignedUpload.fileMimeType,
        originalFileName: "fake.png",
      }),
    },
  );
  const confirmBody = await confirmResponse.json();
  console.log(`[3] Confirm-upload status: ${confirmResponse.status}`);
  console.log(`    body:`, confirmBody);

  if (confirmResponse.status === 400 && confirmBody.error) {
    console.log(`\n✅ Rejection works: server rejected non-PNG payload with clear error.`);
  } else {
    console.error(`\n❌ Expected 400 rejection, got ${confirmResponse.status}`);
    process.exit(1);
  }

  const headResponse = await fetch(presignedUpload.publicUrl, { method: "HEAD" });
  if (headResponse.status === 404) {
    console.log(`✅ Cleanup verified: R2 object was deleted (HEAD returned 404).`);
  } else {
    console.warn(`⚠️  Expected 404 after cleanup, got ${headResponse.status}`);
  }

  await fetch(`${APP}/api/submissions/${id}`, { method: "DELETE" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
