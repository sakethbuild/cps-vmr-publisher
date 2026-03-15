import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

db.exec(`
DROP TABLE IF EXISTS "SubmissionPerson";
DROP TABLE IF EXISTS "Submission";

CREATE TABLE IF NOT EXISTS "Submission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "customTitle" TEXT,
  "subspecialty" TEXT,
  "residencyProgram" TEXT,
  "sessionDate" DATETIME NOT NULL,
  "chiefComplaint" TEXT,
  "youtubeUrl" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL,
  "originalFileName" TEXT,
  "sanitizedFileName" TEXT,
  "fileMimeType" TEXT,
  "fileExtension" TEXT,
  "storagePath" TEXT,
  "previewImagePath" TEXT,
  "previewImageMimeType" TEXT,
  "wordpressPageId" TEXT,
  "wordpressUrl" TEXT,
  "wordpressPrimaryMediaUrl" TEXT,
  "wordpressPreviewMediaUrl" TEXT,
  "wordpressPublishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SubmissionPerson" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "linkType" TEXT NOT NULL,
  "handleOrUrl" TEXT,
  "normalizedUrl" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionPerson_submissionId_fkey"
    FOREIGN KEY ("submissionId")
    REFERENCES "Submission" ("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SubmissionPerson_submissionId_role_sortOrder_idx"
ON "SubmissionPerson" ("submissionId", "role", "sortOrder");
`);

db.close();
console.log(`SQLite database is ready at ${dbPath}`);
