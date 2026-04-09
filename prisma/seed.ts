import { randomUUID } from "node:crypto";

import { createCanvas } from "@napi-rs/canvas";
import {
  PersonLinkType,
  PersonRole,
  PrismaClient,
  SubmissionStatus,
  TemplateType,
} from "@prisma/client";

import { parseSessionDateInput } from "../src/lib/dates";
import { buildSanitizedFilename } from "../src/lib/files";
import { normalizePersonUrl } from "../src/lib/links";
import { buildSubmissionSlug } from "../src/lib/public-pages";
import { getStorageService } from "../src/lib/storage";
import { generateSubmissionTitle } from "../src/lib/templates";

const prisma = new PrismaClient();

type SeedPerson = {
  fullName: string;
  linkType: PersonLinkType;
  handleOrUrl?: string;
};

type SeedSubmission = {
  templateType: TemplateType;
  sessionDate: string;
  subspecialty?: string;
  residencyProgram?: string;
  customTitle?: string;
  chiefComplaint: string;
  youtubeUrl?: string;
  notes?: string;
  status: SubmissionStatus;
  slug?: string;
  publishedAt?: Date;
  presenters: SeedPerson[];
  discussants: SeedPerson[];
  fileType: "pdf" | "png";
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createPdfBuffer(text: string) {
  const stream = `BT /F1 18 Tf 72 720 Td (${escapePdfText(text)}) Tj ET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`,
  ];

  let document = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(document, "utf8"));
    document += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(document, "utf8");
  document += `xref\n0 ${objects.length + 1}\n`;
  document += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    document += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(document, "utf8");
}

async function createPngBuffer(label: string, accent: string) {
  const canvas = createCanvas(1600, 900);
  const context = canvas.getContext("2d");

  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, accent);
  gradient.addColorStop(1, "#f8fafc");
  context.fillStyle = gradient;
  context.fillRect(60, 60, canvas.width - 120, canvas.height - 120);

  context.fillStyle = "#0f172a";
  context.font = "bold 70px sans-serif";
  context.fillText("Sunday Fundamentals VMR", 120, 240);
  context.font = "38px sans-serif";
  context.fillText(label, 120, 330);

  context.fillStyle = "#ffffff";
  context.fillRect(120, 420, 540, 220);
  context.fillStyle = accent;
  context.fillRect(700, 420, 780, 220);
  context.fillStyle = "#0f172a";
  context.font = "32px sans-serif";
  context.fillText("Seed image preview", 160, 540);

  return Buffer.from(await canvas.encode("png"));
}

function createPeopleRecords(
  role: PersonRole,
  people: SeedPerson[],
) {
  return people.map((person, index) => ({
    id: randomUUID(),
    role,
    fullName: person.fullName,
    linkType: person.linkType,
    handleOrUrl: person.handleOrUrl ?? null,
    normalizedUrl: normalizePersonUrl(person.linkType, person.handleOrUrl),
    sortOrder: index,
  }));
}

async function saveSeedUpload(
  submissionId: string,
  templateType: TemplateType,
  sessionDate: string,
  fileType: "pdf" | "png",
  label: string,
) {
  const storage = getStorageService();
  await storage.ensureRoot();

  const fileName = buildSanitizedFilename({
    templateType,
    sessionDate,
    extension: fileType,
  });

  const relativeFolder = `seed/${submissionId}`;
  const buffer =
    fileType === "pdf"
      ? createPdfBuffer(label)
      : await createPngBuffer(label, "#0ea5e9");

  const storedFile = await storage.saveFile({
    buffer,
    fileName,
    folder: relativeFolder,
  });

  return {
    originalFileName: fileName,
    sanitizedFileName: fileName,
    fileMimeType: fileType === "pdf" ? "application/pdf" : "image/png",
    fileExtension: fileType,
    storagePath: storedFile.relativePath,
    previewImagePath: fileType === "png" ? storedFile.relativePath : null,
    previewImageMimeType: fileType === "png" ? "image/png" : null,
  };
}

const seedSubmissions: SeedSubmission[] = [
  {
    templateType: "standard",
    sessionDate: "2026-03-14",
    chiefComplaint: "Progressive dyspnea and orthopnea",
    status: "awaiting_youtube",
    presenters: [
      { fullName: "Dr. Maya Patel", linkType: "x", handleOrUrl: "@mayapatel" },
    ],
    discussants: [
      { fullName: "Dr. Chris Ncube", linkType: "none" },
      {
        fullName: "Dr. Nandi Jacobs",
        linkType: "instagram",
        handleOrUrl: "drnandijacobs",
      },
    ],
    notes: "Awaiting final YouTube URL before draft creation.",
    fileType: "pdf",
  },
  {
    templateType: "raphael_medina_subspecialty",
    sessionDate: "2026-03-21",
    subspecialty: "Cardiology",
    chiefComplaint: "New murmur with embolic stroke",
    youtubeUrl: "https://youtube.com/watch?v=cardio-example",
    status: "ready_to_publish",
    presenters: [
      { fullName: "Dr. Raphael Medina", linkType: "x", handleOrUrl: "raphaelmedina" },
    ],
    discussants: [{ fullName: "Dr. Leila Thomas", linkType: "none" }],
    notes: "Ready to publish as soon as the final internal review is complete.",
    fileType: "pdf",
  },
  {
    templateType: "img_vmr",
    sessionDate: "2026-03-28",
    residencyProgram: "University of Cape Town Internal Medicine",
    chiefComplaint: "Fever and pancytopenia in a recent immigrant",
    youtubeUrl: "https://youtube.com/watch?v=img-example",
    status: "published",
    presenters: [{ fullName: "Dr. Ali Hasan", linkType: "instagram", handleOrUrl: "@alihasan" }],
    discussants: [{ fullName: "Dr. Priya Singh", linkType: "custom", handleOrUrl: "https://example.com/priya-singh" }],
    notes: "A published IMG VMR page that is already live for external readers.",
    fileType: "pdf",
    slug: "img-virtual-morning-report-university-of-cape-town-internal-medicine-march-28-2026",
    publishedAt: new Date("2026-03-28T12:00:00.000Z"),
  },
  {
    templateType: "sunday_fundamentals",
    sessionDate: "2026-04-05",
    chiefComplaint: "Approach to metabolic acidosis",
    status: "published",
    presenters: [{ fullName: "Dr. Sarah Mokoena", linkType: "none" }],
    discussants: [{ fullName: "Dr. Ethan Brooks", linkType: "x", handleOrUrl: "@ethanbrooks" }],
    notes:
      "A Sunday Fundamentals recap with a simple graphic and a short teaching paragraph below it.",
    fileType: "png",
    slug: "sunday-fundamentals-vmr-april-5-2026",
    publishedAt: new Date("2026-04-05T12:00:00.000Z"),
  },
  {
    templateType: "custom",
    sessionDate: "2026-04-12",
    customTitle: "CPS Special Collaborative Case Review",
    chiefComplaint: "Multisystem inflammatory syndrome after infection",
    status: "submitted",
    presenters: [{ fullName: "Dr. Lwazi Dlamini", linkType: "custom", handleOrUrl: "https://example.com/lwazi-dlamini" }],
    discussants: [{ fullName: "Dr. Elena Adams", linkType: "none" }],
    notes: "Custom submission waiting for admin review before being marked ready.",
    fileType: "pdf",
  },
];

async function main() {
  await prisma.submissionPerson.deleteMany();
  await prisma.submission.deleteMany();

  for (const seed of seedSubmissions) {
    const submissionId = randomUUID();
    const upload = await saveSeedUpload(
      submissionId,
      seed.templateType,
      seed.sessionDate,
      seed.fileType,
      seed.chiefComplaint,
    );
    const sessionDate = parseSessionDateInput(seed.sessionDate);
    const title = generateSubmissionTitle({
      templateType: seed.templateType,
      sessionDate,
      subspecialty: seed.subspecialty,
      residencyProgram: seed.residencyProgram,
      customTitle: seed.customTitle,
    });
    const slug =
      seed.slug ?? (seed.status === "published" ? buildSubmissionSlug(title) : null);

    await prisma.submission.create({
      data: {
        id: submissionId,
        templateType: seed.templateType,
        title,
        slug,
        customTitle: seed.customTitle ?? null,
        subspecialty: seed.subspecialty ?? null,
        residencyProgram: seed.residencyProgram ?? null,
        sessionDate,
        chiefComplaint: seed.chiefComplaint,
        youtubeUrl: seed.youtubeUrl ?? null,
        notes: seed.notes ?? null,
        status: seed.status,
        publishedAt: seed.publishedAt ?? null,
        ...upload,
        people: {
          create: [
            ...createPeopleRecords("presenter", seed.presenters),
            ...createPeopleRecords("discussant", seed.discussants),
          ],
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
