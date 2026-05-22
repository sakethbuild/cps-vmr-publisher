# TODOS

Active follow-ups captured outside the README.

## ~~Auth: page-level re-check on admin server components~~ (CLOSED 2026-05-20)

Closed by the per-user-accounts work. Every admin server page now calls
`requireUserOrRedirect()` or `requireSuperAdminOrNotFound()` at the top, looking up
the user from the DB. Middleware still does the request-level check; pages now do
an independent DB lookup. Defense in depth in place.

## ~~Pivot uploads from PNG-only to PDF-canonical~~ (CLOSED 2026-05-22)

Closed by commit `5049a9b`. PDFs are now the canonical upload format across every
template. The confirm-upload route auto-generates a PNG thumbnail of the first page
(non-fatal — falls back to a placeholder if rendering fails). Public pages render
the thumbnail as a hero image with a Download PDF button below. Archive cards use
`thumbnailPath` instead of the raw upload. Tests inverted: 31 passing, PDF accepted,
PNG/JPG explicitly rejected.

Driver: PNG renders were too low-quality for slide content. PDF preserves vector
text, ships at native resolution to the viewer, and is what presenters export from
PowerPoint/Keynote anyway.

## Deploy PDF-canonical pivot to production

**What:** Push the `feat/png-r2-and-user-accounts` branch's latest commits to prod. Requires (1) additive Turso schema migration adding `thumbnailPath` and `thumbnailMimeType` nullable columns to `Submission`, and (2) Vercel production deploy.

**Why:** Code is committed locally and passes 31/31 tests; production is still on the previous PNG flow.

**Pros:** Ships the quality improvement. Schema migration is additive only (two nullable columns), so it cannot break existing rows.

**Cons:** Needs explicit user authorization for the production DB push (classifier blocks `prisma db push` against `libsql://…turso.io` by default).

**Context:** After schema migration, deploy via `npx -y vercel --prod --yes`, then smoke-test a real PDF upload end-to-end at https://cps-vmr-publisher.vercel.app to verify the thumbnail renders on the archive card and the Download PDF button works on the public page.

**Depends on / blocked by:** User authorization for the prod `prisma db push`.

**Source:** PDF-canonical pivot, 2026-05-22.

## MFA (TOTP) for super admin

**What:** Add optional TOTP-based 2FA via `otplib` + a QR-code enrollment flow on `/admin/account/security`.

**Why:** Super admin can publish, unpublish, delete, and edit live VMRs. A leaked password gives an attacker full control of what's public. MFA reduces blast radius of credential theft.

**Pros:** Standard security control. Local-only (no external service needed). Authenticator apps are ubiquitous.

**Cons:** Recovery flow needed (10 single-use codes shown on enrollment). Adds ~6 files. Need to handle lost-device case via super-admin reset.

**Context:** The current login is single-factor email + bcrypt password. Sessions are HMAC-signed cookies (30 days). After MFA is enrolled, login becomes two-step: password verifies, then TOTP challenge before the cookie is set.

**Depends on / blocked by:** Nothing.

**Source:** Surfaced by /plan-design-review (2026-05-20), deferred per user choice in user-accounts implementation.

## Password reset via email

**What:** Add a "Forgot password?" link on `/login` that emails a one-time reset token. Today, password reset is super-admin-only via `/admin/users` (manual reset, password shared verbally).

**Why:** Members forget passwords. Manual reset adds friction and requires the super admin to be available.

**Pros:** Self-serve recovery. Standard UX. Removes super-admin as a bottleneck.

**Cons:** Requires an email service. Resend free tier (3,000 emails/month) is the lightest option. Adds ~4 files + env config + domain verification.

**Context:** Schema would gain `PasswordResetToken { id, userId, expiresAt, usedAt }`. `/api/auth/forgot-password` creates token + emails URL. `/api/auth/reset-password/[token]` applies new password. UI: `/forgot-password`, `/reset-password/[token]`.

**Depends on / blocked by:** External email provider signup.

**Source:** Surfaced by /plan-design-review (2026-05-20), deferred per user choice in user-accounts implementation.

## Post-implementation a11y audit (PDF upload flow)

**What:** After the PDF-canonical migration ships to prod, run a real screen-reader audit (VoiceOver on macOS or NVDA on Windows) against the submit form, public VMR page lightbox + Download PDF button, and admin replace-PDF flow.

**Why:** The plan includes full ARIA spec (role="progressbar", aria-valuenow, role="alert", focus trap, aria-describedby), but specs are not implementations. Live audits catch what the spec misses, especially focus order during the upload → confirming → success state transition, the lightbox open/close cycle, and the Download PDF button label/state.

**Pros:** Catches real-world a11y regressions before users hit them. ~15–20 min audit pass per surface.

**Cons:** Manual testing time. Findings may require small follow-up PR.

**Context:** Auditor walks: (1) submit form with keyboard only, screen reader on; (2) trigger PDF upload, verify progress announcements + "generating preview" state is announced; (3) trigger magic-byte rejection (e.g. a renamed PNG), verify error is announced; (4) public VMR page, open lightbox via Enter, verify focus trap + Esc, then tab to Download PDF and confirm label reads as a download intent; (5) admin replace-PDF, verify same flow.

**Depends on / blocked by:** PDF-canonical migration must be deployed first (commit `5049a9b`, prod schema migration pending).

**Source:** Surfaced by /plan-design-review during PNG/R2 migration design pass (2026-05-20). Updated 2026-05-22 after PDF-canonical pivot.

## Formalize DESIGN.md via /design-consultation

**What:** Run /design-consultation to capture the existing SearchCPS palette + component conventions as a formal DESIGN.md file in the repo root.

**Why:** The de-facto design system in `src/app/globals.css` is well-formed but undocumented as a system. Future design reviews would calibrate against it explicitly; new contributors would see the design rules in one place.

**Pros:** Single source of truth. Makes /plan-design-review and /design-review sharper. Codifies tribal knowledge.

**Cons:** Another doc to maintain. globals.css already serves this purpose for engineers.

**Context:** Current system: dark theme matching SearchCPS (background #0f1117, surface #1a1d27, accent #5470dd, text #e4e6f0). Light mode is a sibling palette. Component primitives in `src/components/ui/`. VmrCard sets the visual language for cards.

**Depends on / blocked by:** Nothing. Independent of the PNG/R2 migration.

**Source:** Surfaced by /plan-design-review during PNG/R2 migration design pass (2026-05-20).
