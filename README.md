# CPS VMR Submissions

Standalone internal prototype web app for CPS team members to submit, review, and publish Virtual Morning Report pages.

The app is now the source of truth. When admin publishes a submission, it becomes a live public page in this app. WordPress stays manual: create one CPS WordPress page per VMR and link visitors to the public page.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Prisma 6 (`@prisma/adapter-libsql`)
- SQLite locally, Turso (libSQL) in production
- Cloudflare R2 for upload storage in production (S3-compatible)
- bcryptjs + HMAC-signed session cookies for auth
- `pdfjs-serverless` + `@napi-rs/canvas` for first-page PDF → PNG thumbnail rendering

## What this version includes

- Submission form for:
  - `standard`
  - `raphael_medina_subspecialty`
  - `img_vmr`
  - `sunday_fundamentals`
  - `custom`
- **PDF-only uploads** across every template (5 MB cap, magic-byte verified)
- Auto-generated PNG thumbnails (first page) for archive cards and public-page previews
- Public page renders a thumbnail hero + Download PDF button so quality stays high
- Two-tier auth: per-user accounts (bcrypt) with super-admin and member roles
- Shared-credential mode supported (members can be issued a common email + password; member self-service password change is locked down so the shared password can't be rotated by one user)
- Direct browser → R2 presigned PUT uploads (two-phase: presign → upload → confirm)
- Structured presenters and discussants with link normalization
- Consistent `Month Day, Year` date formatting
- Automatic title generation
- Status workflow for review and publishing
- Public archive and public submission pages
- Image lightbox + accessible ARIA across the upload pipeline
- Admin dashboard for review, editing, publish, unpublish, delete, and WordPress handoff

## What this version does not include

- MFA (TOTP) for super admin — see TODOS
- Email-based password reset — see TODOS
- Email ingestion
- Automatic YouTube lookup
- Past episodes automation
- Automatic WordPress publishing
- Elementor automation

## Main workflow

1. A team member submits a VMR.
2. Admin reviews and edits it in `/admin`.
3. When it is ready, admin clicks `Publish Public Page`.
4. The app makes the VMR live at `/vmr/[slug]`.
5. Admin copies the public URL and adds it to the matching CPS WordPress page.

## Statuses

- `submitted`
- `awaiting_youtube`
- `ready_to_publish`
- `published`

Rules:

- `standard`, `raphael_medina_subspecialty`, and `img_vmr`
  - need required fields, upload, and YouTube URL before they become `ready_to_publish`
- `sunday_fundamentals`
  - becomes `ready_to_publish` once required fields and upload are complete
- `custom`
  - becomes `ready_to_publish` once `customTitle` and `sessionDate` are complete
- `published`
  - means the public page is live

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Review environment values in `.env` or copy from `.env.example`.

3. Generate the Prisma client:

```bash
npm run prisma:generate
```

4. Create the local SQLite database:

```bash
npm run db:setup
```

5. Seed example submissions:

```bash
npm run prisma:seed
```

6. Start the development server:

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Main routes

- `/` overview page
- `/submit` submission form
- `/admin` admin dashboard
- `/admin/submissions/[id]` admin detail/edit page
- `/vmr` public archive
- `/vmr/[slug]` public VMR page

## Environment variables

See `.env.example`. Required:

- `DATABASE_URL` — `file:./dev.db` locally; `libsql://…?authToken=…` in production
- `APP_BASE_URL` — public origin (e.g. `https://cps-vmr-publisher.vercel.app`)
- `SESSION_SECRET` — random 32+ byte string used to sign session cookies
- `STORAGE_ROOT` — local filesystem path used when R2 is not configured (dev only)

R2 (production):

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL` — public read URL prefix for the bucket
- `CRON_SECRET` — shared secret for the cleanup cron route

## Upload storage

- Production: Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3`. The browser uploads PDFs directly to R2 with a presigned PUT URL; the server then HEAD-verifies size and magic bytes before flipping `uploadConfirmedAt`.
- Dev: local filesystem under `STORAGE_ROOT` behind the same storage interface.
- PDFs are the canonical file. On confirm, the server renders the first page to PNG via `pdfjs-serverless` and stores it as a sibling `.thumb.png`. Thumbnail generation is non-fatal — if it fails, the submission still saves and the archive falls back to a placeholder.

## WordPress handoff

This app does not create WordPress pages.

Instead:

1. Publish the submission in this app.
2. Copy the public URL from the admin detail page.
3. Create or update the matching CPS WordPress page manually.
4. Add a clear CTA link to the public VMR page.

Recommended WordPress pattern:

- one WordPress page per VMR
- the WordPress page title matches the VMR title
- the page body contains a simple link to the public VMR page

## Development commands

```bash
npm run dev
npm run lint
npm run test
npm run db:setup
npm run prisma:generate
npm run prisma:seed
```

## Manual test checklist

- Create a new standard submission without a YouTube URL and confirm status becomes `awaiting_youtube`.
- Add a YouTube URL on the detail page and confirm status moves to `ready_to_publish`.
- Publish the submission and confirm:
  - status becomes `published`
  - a public URL appears on the detail page
  - the public route loads
- Unpublish the submission and confirm:
  - the public route no longer works
  - the submission moves back into a non-public review status
- Open `/vmr` and confirm only published submissions appear there.
- Open a published public page and confirm presenter/discussant links work correctly.
- Upload a PDF on any template and confirm:
  - the upload progresses to confirming, then succeeds
  - a PNG thumbnail is auto-generated and shown on the archive card
  - the public page shows the thumbnail hero and a working Download PDF button
- Try to upload a PNG, JPG, or other non-PDF file and confirm the editor rejects it client-side with a "Pick a PDF file" error.
- Confirm the WordPress handoff panel shows:
  - the public URL
  - the suggested page title
  - the suggested link label

## Important TODO points

See `TODOS.md` for the live list. Open items at time of writing:

- MFA (TOTP) for super admin
- Email-based password reset
- Post-deploy a11y audit of the PDF upload flow
- Formalize `DESIGN.md` via `/design-consultation`

## Seed data

The seed script creates five example submissions:

- one for each template type
- mixed statuses
- published examples for public-page testing
- local sample files for previews and download testing

## Notes for future integration

- Keep the storage service behind its interface — R2 and local-disk implementations both implement the same `StorageService` contract.
- Auth lives in `src/lib/auth.ts` (User-table backed). Middleware enforces sessions per request; server components re-check via `requireUserOrRedirect()` / `requireSuperAdminOrNotFound()` for defense in depth.
- When moving into the main app, reuse the shared utilities for:
  - title generation
  - status calculation
  - person link normalization
  - filename sanitization
  - slug generation
  - PDF first-page thumbnail rendering (`src/lib/pdf-conversion.ts`)
