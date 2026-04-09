# CPS VMR Submissions

Standalone internal prototype web app for CPS team members to submit, review, and publish Virtual Morning Report pages.

The app is now the source of truth. When admin publishes a submission, it becomes a live public page in this app. WordPress stays manual: create one CPS WordPress page per VMR and link visitors to the public page.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite for local development

## What this version includes

- Submission form for:
  - `standard`
  - `raphael_medina_subspecialty`
  - `img_vmr`
  - `sunday_fundamentals`
  - `custom`
- Structured presenters and discussants with link normalization
- Consistent `Month Day, Year` date formatting
- Automatic title generation
- Status workflow for review and publishing
- Public archive and public submission pages
- Local file storage behind a storage service abstraction
- Sunday Fundamentals image/PDF support
- Sunday PDF first-page conversion to PNG
- Admin dashboard for review, editing, publish, unpublish, and WordPress handoff

## What this version does not include

- Real authentication
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

See `.env.example`:

- `DATABASE_URL`
- `STORAGE_ROOT`
- `APP_BASE_URL`

## Upload storage

- Files are stored locally under the directory set by `STORAGE_ROOT`
- Uploads are streamed back through app routes instead of exposing the storage folder directly
- The storage layer is abstracted so it can later be replaced with Vercel Blob or another provider

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
- Upload a Sunday Fundamentals PDF and confirm:
  - the first page is converted to PNG
  - the PNG is shown in admin
  - the public page uses the image preview
- Confirm the WordPress handoff panel shows:
  - the public URL
  - the suggested page title
  - the suggested link label

## Important TODO points

- `src/lib/auth.ts`
  - replace the internal prototype no-op with real authentication and authorization
- `src/lib/storage/index.ts`
  - replace local disk storage with Vercel Blob or another production storage provider
- public hosting
  - optionally move the public pages from the app URL to a CPS-branded subdomain later

## Seed data

The seed script creates five example submissions:

- one for each template type
- mixed statuses
- published examples for public-page testing
- local sample files for previews and download testing

## Notes for future integration

- Keep the storage service behind its interface
- Keep admin access logic behind the auth placeholder
- When moving into the main app, reuse the shared utilities for:
  - title generation
  - status calculation
  - person link normalization
  - filename sanitization
  - slug generation
