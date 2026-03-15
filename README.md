# CPS VMR Submissions

Standalone internal prototype web app for CPS team members to submit, review, and prepare Virtual Morning Report entries before later moving the feature into an existing Vercel app.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite for local development

## What version 1 includes

- Submission form for these template types:
  - `standard`
  - `raphael_medina_subspecialty`
  - `img_vmr`
  - `sunday_fundamentals`
  - `custom`
- Structured presenters and discussants with link normalization
- Consistent `Month Day, Year` date formatting
- Automatic title generation
- Status workflow with ready rules
- Local file storage behind a storage service abstraction
- Sunday Fundamentals image/PDF support
- Sunday PDF first-page conversion to PNG
- Admin dashboard for filtering, reviewing, editing, and mock publishing
- WordPress publishing service with both mock and real modes

## What version 1 does not include

- Real authentication
- Email ingestion
- Automatic YouTube lookup
- Past episodes automation
- Elementor automation

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

5. Seed example submissions for every template type:

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
- `/admin/submissions/[id]` submission detail and edit page

## Environment variables

See `.env.example`:

- `DATABASE_URL`
- `STORAGE_ROOT`
- `WORDPRESS_MODE`
- `WORDPRESS_BASE_URL`
- `WORDPRESS_USERNAME`
- `WORDPRESS_APPLICATION_PASSWORD`

## Upload storage

- Files are stored locally under the directory set by `STORAGE_ROOT`
- Uploads are streamed back through app routes instead of exposing the storage folder directly
- The storage layer is abstracted so it can later be replaced by Vercel Blob or another provider

## WordPress behavior

- Default mode is `mock`
- Mock mode simulates draft creation and stores:
  - `wordpressPageId`
  - `wordpressUrl`
- `wordpressPrimaryMediaUrl`
- `wordpressPreviewMediaUrl`
- Real mode:
  - authenticates with WordPress application-password credentials
  - uploads relevant PDFs for standard, Raphael, IMG, and custom submissions when present
  - uploads the Sunday Fundamentals preview image asset
  - creates a draft page and stores the returned page ID and page URL
  - keeps Elementor automation out of scope and leaves TODO markers for later integration

## WordPress credential setup

1. In WordPress, create an Application Password for the account that should create drafts and upload media.
2. Update your local `.env` values:

```bash
WORDPRESS_MODE="real"
WORDPRESS_BASE_URL="https://your-wordpress-site.com"
WORDPRESS_USERNAME="your-wordpress-username"
WORDPRESS_APPLICATION_PASSWORD="your application password"
```

3. Restart the dev server after changing `.env`.
4. Use the admin detail page and click `Create WordPress Draft`.

If you want to return to safe local simulation, set:

```bash
WORDPRESS_MODE="mock"
```

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

- Start in mock mode and confirm `Create WordPress Draft` stores a mock page ID and URL.
- Open a standard, Raphael, or IMG submission without a YouTube URL and confirm status stays `awaiting_youtube`.
- Add a YouTube URL on the detail page and confirm status moves to `ready_for_draft`.
- Upload a Sunday Fundamentals PDF and confirm the generated preview image appears in the admin detail view.
- Switch to real mode with valid WordPress credentials and create a draft for:
  - one PDF-based submission
  - one Sunday Fundamentals submission
  - one custom submission
- In WordPress, confirm:
  - the media library contains the uploaded PDF when relevant
  - the media library contains the Sunday preview image
  - the page is created as a draft
  - the draft title matches the generated title or custom title
  - the draft content contains the correct placeholder structure
- Switch back to mock mode and confirm the safe flow still works.

## Important TODO points

- `src/lib/auth.ts`
  - Replace the internal prototype no-op with real authentication and authorization
- `src/lib/storage/index.ts`
  - Replace local disk storage with Vercel Blob or another production storage provider
- `src/lib/wordpress/real-wordpress-publisher.ts`
  - Extend the placeholder draft content into the final Elementor/template automation flow

## Seed data

The seed script creates five example submissions:

- one for each template type
- mixed workflow states
- local sample files for previews and draft-link testing

## Notes for future integration

- Keep the storage and WordPress services behind their interfaces
- Keep admin access logic behind the auth placeholder
- When moving into the main app, reuse the shared utilities for:
  - title generation
  - status calculation
  - person link normalization
  - filename sanitization
