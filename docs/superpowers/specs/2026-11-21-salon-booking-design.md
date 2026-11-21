# Salon Booking — Design

Date: 2026-11-21
Status: awaiting owner approval

## Intent and why

Ziad is a junior full-stack freelancer in Madrid. His GitHub currently shows two static
sites (a restaurant demo, the ONI store showcase) and a Flask chatbot. Nothing proves he
can build a real application with a database, authentication and an admin back office —
which is exactly what small-business clients pay for.

This project is an online booking system for hair salons. It serves two purposes:

1. **Portfolio piece**: a live demo of a fictional Madrid salon that recruiters and
   prospective clients can click through end to end, including the salon's admin side.
2. **Resellable product**: when a real salon wants it, Ziad copies the project, edits a
   single configuration file (name, logo, colours, services, staff, hours, languages),
   connects a database and deploys it under the client's name in about an hour, then bills
   setup plus a monthly hosting/support fee.

Success: a visitor can book a real slot on the live demo in under a minute on a phone,
log into the admin with the demo credentials shown on the login page, and see the
booking appear. The repository reads like professional work (English code, clear README,
tests, screenshots).

## Goals

- Customers book an appointment: service → stylist (or "any available") → date → time
  slot → contact details → confirmation.
- Available time slots are computed from real data: opening hours, each stylist's working
  hours and days off, service duration, existing bookings, minimum notice and how far
  ahead bookings are allowed.
- A slot can never be booked twice, even if two people submit at the same instant
  (enforced in the database, not only in application code).
- Customers receive a confirmation email containing a private link to view or cancel
  their booking (no customer accounts).
- The salon has a password-protected admin dashboard: day and week views per stylist,
  booking details, cancel, move to another slot, mark as no-show, and block time off
  (e.g. a stylist's holiday or a closed afternoon).
- Everything salon-specific lives in one configuration file. Customising for a new
  client requires no other code changes.
- Public pages in English by default with a Spanish toggle; the list of languages is
  set in the configuration file. Code, README, admin dashboard and commit messages are
  in English.
- Mobile-first, fast, accessible, and visually distinctive (must not look like a
  generic template).

## Non-goals (v1)

- Online payment or deposits.
- Several salons in one deployment (multi-tenant). One deployment = one salon.
- Customer accounts or login.
- SMS / WhatsApp reminders, Google Calendar sync, loyalty programmes, reviews.
- Several admin roles. One salon admin login is enough.

## Anti-goals (failure even if it "works")

- Any double booking.
- Slots shown as available that are not, or wrong times because of time zones
  (the salon's zone is fixed in config, e.g. Europe/Madrid, including DST changes).
- A demo that is slow to load, broken on a phone, or empty/vandalised when a recruiter
  opens it.
- Secrets (database URL, email API key, admin password) committed to the repository.
- Customising for a client requiring edits scattered across the code.

## Constraints

- Hosting: Vercel (free tier). Database: PostgreSQL on Neon (free tier). Ziad will need to
  create both accounts; nothing paid.
- Repository: `elalamiz605-tech/salon-booking` (public, currently empty).
- Must build and run in a plain Node 22 environment; tests must run without any external
  service (no network database, no real email).
- Ziad is new to React/TypeScript, so the code must be readable and well organised, with
  the tricky logic (availability) isolated and tested.

## Approaches considered

- **A. Next.js (App Router) + TypeScript + PostgreSQL, hosted on Vercel** — **chosen by
  Ziad.** One project for pages and server logic, free hosting with no cold-start delay,
  and it adds the most in-demand stack (Next.js, React, TypeScript, PostgreSQL) to his
  profile. Trade-off: React is new to him.
- **B. Node.js/Express + plain HTML/JS + PostgreSQL, hosted on Render.** Matches his
  current profile and is simpler to read, but Render's free tier sleeps (30–50 s first
  load, bad for a demo) and it looks less modern.
- **C. Flask/Python.** Rejected: repeats what the chatbot already shows.

## Decided by the owner

- Hair salon, fictional, in Madrid.
- Resellable via a single configuration file (not demo-only).
- English for code, README, admin and default public language; Spanish toggle on public
  pages; languages configurable per client.
- Approach A.
- **Who edits services, prices, staff and hours: Ziad only, via the configuration file**
  (option 1). The salon asks Ziad, who edits the config and redeploys; this is part of
  the paid monthly support. Consequences:
  - Services, staff, weekly opening hours and each stylist's recurring weekly days off
    live in the configuration file only; there are no admin screens to edit them.
  - One-off closures and time off (holidays, a closed afternoon) are admin time blocks
    stored in the database.
  - Each booking stores the service name, duration and price as they were at booking
    time, so later config changes never alter existing bookings.
  - If a config change removes a stylist or service that still has future bookings,
    those bookings are kept and flagged in the admin dashboard for the salon to handle.

## Calls made by Claude (owner may override)

- **Demo salon name**: "Rizo Studio" (rizo = curl), Madrid. Fictional address, phone and
  team of three stylists, around eight services (cut, cut & blow-dry, colour, highlights,
  beard trim, kids' cut…) with realistic durations and euro prices.
- **Demo mode** (on for the public demo, off for client deployments via a config/env
  flag): the admin login page shows demo credentials; the database is reset nightly to a
  realistic seed (a few days of past and upcoming bookings) by a scheduled job; outgoing
  emails go only to the address the visitor typed, with a "demo" note.
- **Emails** sent through Resend (free tier) when an API key is configured; with no key,
  emails are written to the server log so local development and tests need no account.
- **Admin authentication**: a single admin account whose email and hashed password come
  from environment variables; session in a secure, HTTP-only cookie. Login attempts are
  rate-limited.
- **Customer booking link**: a long random token in the URL lets the customer view and
  cancel; cancellations are allowed until a configurable cut-off (default 2 hours before).
- **Slot step**: 15 minutes by default (configurable). Optional buffer between
  appointments per service.
- **"Any available stylist"**: assigns the stylist with the fewest bookings that day among
  those free for the whole slot.
- **Visual direction**: decided during build using the frontend design guidance; colours
  and fonts are configuration tokens so each client gets their own look.
- **Client hosting**: Vercel's free (Hobby) plan is non-commercial, so it hosts only the
  demo. Each paying client gets their own Vercel and Neon accounts (Ziad sets them up and
  hands them over; no running cost for Ziad). The README deployment guide is written for
  that. Hosting everything on Ziad's own Vercel Pro plan later stays possible.
- **Emails need a domain**: Resend delivers to arbitrary recipients only from a verified
  domain. So the confirmation page always shows the private manage/cancel link (the email
  is a copy, not the only way in). In demo mode no email is sent at all: the confirmation
  page shows a preview of the email instead. This also prevents the demo form being used
  to send email to arbitrary addresses. For a client, verifying their domain with Resend
  is an onboarding step in the README.
- **Demo protection**: one shared demo admin (no per-visitor sandbox). The demo data is
  reset at least hourly (not only nightly), public booking is rate-limited per IP, and the
  form has an invisible honeypot field instead of a captcha (keeps the one-minute phone
  flow).
- **Admin can create bookings** (phone and walk-in customers): same availability rules
  and double-booking protection, but minimum notice and booking window are ignored and
  email is optional. Each booking records its source (online / admin).
- **Privacy (GDPR) defaults** for Spanish salons: a consent checkbox linking to a privacy
  page generated from config (salon legal name, contact), customer data anonymised
  automatically after a configurable period (default 24 months), and the admin can delete
  a customer's data on request. The privacy text is a template, not legal advice; the
  client remains responsible for its wording.

## Left to the builder

- Libraries (ORM, validation, UI components, date/time-zone handling, i18n), as long as
  the configuration-file and testing constraints hold.
- Exact database schema and how the no-double-booking rule is enforced in PostgreSQL
  (e.g. an exclusion constraint on stylist + time range).
- How the local/test database runs without network access (e.g. an embedded Postgres).
- Page layouts, component structure, and admin calendar presentation.
- Test strategy details (unit tests for availability; end-to-end test of the booking
  flow and admin login at minimum).
- README contents (screenshots, live-demo link, "customise for your salon" guide,
  deployment steps for Vercel + Neon).
