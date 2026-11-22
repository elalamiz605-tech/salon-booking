# Rizo Studio Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a resellable online booking system for a men's barbershop (demo: Rizo Studio, Madrid) with an animated 3D homepage, a one-minute booking flow, private manage links and a password-protected admin dashboard.

**Architecture:** One Next.js (App Router, TypeScript) app. Everything salon-specific comes from `salon.config.ts`, validated with zod at startup. The availability engine is a pure, fully tested module; the database (PostgreSQL via Drizzle) enforces "no double booking" with an exclusion constraint. Local dev and all tests run on embedded PGlite (no network); production uses Neon through `DATABASE_URL`.

**Tech Stack:** Next.js (current stable, App Router, `src/` dir), TypeScript strict, Tailwind CSS, Drizzle ORM + drizzle-kit, `postgres` (postgres.js) in production, `@electric-sql/pglite` (+ `btree_gist` contrib) in dev/tests, zod, date-fns + `@date-fns/tz`, jose (session JWT), bcryptjs, Resend, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-21-salon-booking-design.md` (read it first). Approved homepage prototype: `docs/prototype/hero.html`; hero media in `public/hero/`.

## Global Constraints

- Node 22. All code, comments, commit messages, README and admin UI in English.
- Public pages: locales come from config (`['en','es']`, default `en`); every user-visible public string exists in both dictionaries.
- Salon time zone comes from config (`Europe/Madrid`); every date shown or computed for the salon uses it, including DST days.
- Money is stored as integer cents (`EUR`). Durations are integer minutes.
- No secret in the repo: `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `DEMO_MODE` are environment variables; `.env.example` lists them with placeholders.
- Tests never touch the network: PGlite in memory, emails logged.
- Salon-specific data (name, services, barbers, hours, hero media, colours, fonts, languages, legal name) lives only in `salon.config.ts`.
- No customer accounts, no online payment, one salon per deployment.
- Mobile first: every page works at 390 px wide with no horizontal scroll.
- All motion is disabled under `prefers-reduced-motion: reduce` (the hero shows the still photo).
- Visual tokens from the spec: graphite `#0b0b0c`, ivory `#ece9e4`, ivory-dim `#aaa6a0`, champagne `#cbb894`, oxblood `#6b1420` (hover `#84202e`); Cormorant Garamond (display) + Manrope (text).
- Run Playwright with `--trace off`.

## Review Focus

1. Booking on a DST-change day (2026-03-29 or 2026-10-25, Europe/Madrid): slots show the correct local times and none are duplicated or missing → test in Task 3 and Task 4.
2. Two visitors submit the same slot at the same instant: exactly one booking is created, the other sees "This time was just taken" and fresh slots, never a server error → tests in Task 6 and Task 11.
3. A manage link that is unknown, already cancelled, past the cancellation cut-off, or anonymised: a clear page saying so, never a crash → tests in Task 12.
4. Admin blocks a period that overlaps existing bookings: refused with the list of affected bookings, nothing silently cancelled → test in Task 14.
5. "Today" late in the day and the last day of the booking window: no past slots, nothing beyond day 30, slots ending exactly at closing time are offered → tests in Task 4.

---

## File Structure

```
salon.config.ts                    # the ONE file edited per client
src/config/schema.ts               # zod schema + SalonConfig type + loadConfig()
src/lib/time.ts                    # time-zone helpers (pure)
src/lib/availability.ts            # slot engine + pickBarber (pure)
src/lib/opening-status.ts          # "Open now · until 20:00" (pure)
src/db/schema.ts                   # Drizzle tables
src/db/client.ts                   # getDb(): postgres.js or PGlite
src/db/migrations/*.sql            # generated + hand-written constraint
src/server/bookings.ts             # create / cancel / move / list / anonymise
src/server/rate-limit.ts           # fixed-window limiter in the DB
src/server/demo.ts                 # seed + maybeResetDemo()
src/server/maintenance.ts          # retention anonymisation + demo reset
src/server/email.ts                # render + send (Resend or log)
src/server/auth.ts                 # admin session (jose) + password check
src/i18n/{en,es}.ts, src/i18n/index.ts
src/app/[locale]/page.tsx          # home
src/app/[locale]/book/page.tsx     # booking flow
src/app/[locale]/booking/[token]/page.tsx
src/app/[locale]/privacy/page.tsx
src/app/admin/...                  # login, dashboard, booking detail, new, blocks
src/app/api/availability/route.ts
src/app/api/cron/maintenance/route.ts
src/components/hero/HeroScene.tsx  # WebGL port of the prototype
tests/unit/*.test.ts, tests/e2e/*.spec.ts, tests/helpers/db.ts
```

---

### Task 1: Project scaffold and CI

**Files:**
- Create: Next.js app (root), `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `.env.example`, `tests/unit/smoke.test.ts`
- Keep: `docs/`, `public/hero/`

**Interfaces:**
- Produces: scripts `npm run lint`, `npm run typecheck` (`tsc --noEmit`), `npm test` (Vitest), `npm run e2e` (Playwright, starts `next dev` on port 3000 via `webServer`).

- [ ] **Step 1:** Scaffold in place with `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes` (keep existing `docs/` and `public/hero/`). Enable `"strict": true`.
- [ ] **Step 2:** Add Vitest (`environment: 'node'`, alias `@` → `src`) and `tests/unit/smoke.test.ts` asserting `1 + 1 === 2`. Run `npm test` → PASS.
- [ ] **Step 3:** Add Playwright config: projects `desktop` (1440×860) and `phone` (`devices['iPhone 13']`), `use: { trace: 'off' }`, `webServer: { command: 'rm -rf .data/e2e && npm run dev', port: 3000, reuseExistingServer: false, env: { PGLITE_DIR: '.data/e2e', DEMO_MODE: 'false', ADMIN_EMAIL: 'admin@test.local', ADMIN_PASSWORD_HASH: bcrypt.hashSync('test-password', 10), SESSION_SECRET: 'test-secret-at-least-32-characters-long', CRON_SECRET: 'test-cron' } }` (hash computed in the config file with `bcryptjs`). E2E tests that need data create it through the UI or the admin pages, never by opening the database file.
- [ ] **Step 4:** CI workflow on push/PR: Node 22, `npm ci`, lint, typecheck, `npm test`, `npx playwright install --with-deps chromium`, `npm run e2e -- --project=desktop --project=phone`.
- [ ] **Step 5:** `.env.example` with every variable from Global Constraints, placeholder values, one comment line each. Add `.env*` (except `.env.example`) to `.gitignore`.
- [ ] **Step 6:** Run `npm run lint && npm run typecheck && npm test` → all pass. Commit `chore: scaffold Next.js app with Vitest, Playwright and CI`.

### Task 2: Salon configuration

**Files:**
- Create: `src/config/schema.ts`, `salon.config.ts`
- Test: `tests/unit/config.test.ts`

**Interfaces:**
- Produces:
  - `type Locale = 'en' | 'es'`; `type Localized = Record<Locale, string>`
  - `type DayHours = { open: string; close: string } | null` (`"HH:mm"`); `type WeekHours = Record<0|1|2|3|4|5|6, DayHours>` (0 = Sunday)
  - `type Service = { id: string; name: Localized; description: Localized; durationMin: number; priceCents: number; bufferMin: number }`
  - `type Barber = { id: string; name: string; bio: Localized; serviceIds: string[]; hours?: Partial<WeekHours>; daysOff: number[] }`
  - `type SalonConfig = { name; legalName; tagline: Localized; address; phone; email; timezone; currency: 'EUR'; locales: Locale[]; defaultLocale: Locale; theme: { colors: { ink; ivory; ivoryDim; accent; primary; primaryHover }; fonts: { display; body } }; hero: { photo; depth; video: { mp4; webm } | null }; openingHours: WeekHours; slotStepMin; minNoticeMin; bookingWindowDays; cancelCutoffMin; retentionMonths; rateLimitPerHour; services: Service[]; barbers: Barber[] }`
  - `salonConfigSchema` (zod) and `defineConfig(c: SalonConfig): SalonConfig` (validates, throws a readable error).
  - `config` default export of `salon.config.ts`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/config.test.ts`:
  - `demo config is valid`: `defineConfig(config)` does not throw; `config.services.length === 7`; `config.barbers.length === 3`; `config.timezone === 'Europe/Madrid'`.
  - `rejects a barber offering an unknown service`: a copy with `barbers[0].serviceIds = ['nope']` → throws `/unknown service "nope"/`.
  - `rejects close before open`: `openingHours[2] = { open: '20:00', close: '10:00' }` → throws `/close must be after open/`.
  - `rejects a missing translation`: a service with `name: { en: 'X' }` → throws.
- [ ] **Step 2:** Run `npx vitest run tests/unit/config.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement the schema with cross-field `superRefine` checks (service ids unique, barber ids unique, barber service ids exist, `defaultLocale ∈ locales`, open < close).
- [ ] **Step 4:** Write `salon.config.ts` with the spec's demo data: Rizo Studio, legal name "Rizo Studio S.L.", Calle del Pez 21, 28004 Madrid, phone `+34 910 000 000`, `hola@rizostudio.example`; hours Tue–Sat 10:00–20:00, Sun/Mon closed; `slotStepMin 15`, `minNoticeMin 120`, `bookingWindowDays 30`, `cancelCutoffMin 120`, `retentionMonths 24`, `rateLimitPerHour 5`. Services (id, minutes, euros): `scissor-cut` 45 €32, `skin-fade` 40 €28, `beard-sculpt` 25 €18, `hot-towel-shave` 40 €28, `blow-dry-style` 30 €20, `kids-cut` 30 €18, `grey-blending` 30 €25, each `bufferMin 5`, EN + ES names/descriptions. Barbers: `alvaro` (all services, Tue–Sat), `marco` (all but `hot-towel-shave`, day off Wednesday = 3), `iker` (cuts, fades, kids, blow-dry; hours 12:00–20:00 every open day). Hero: `/hero/hero.webp`, `/hero/depth.webp`, video `/hero/hero.mp4` + `/hero/hero.webm`. Theme values from Global Constraints.
- [ ] **Step 5:** Run the test → PASS. Commit `feat: salon configuration schema and Rizo Studio demo config`.

### Task 3: Time-zone helpers

**Files:**
- Create: `src/lib/time.ts`
- Test: `tests/unit/time.test.ts`

**Interfaces:**
- Produces (all pure; `date` = `"YYYY-MM-DD"` in the salon zone):
  - `zonedInstant(date: string, hhmm: string, tz: string): Date`
  - `localDate(instant: Date, tz: string): string`
  - `localTime(instant: Date, tz: string): string` (`"HH:mm"`)
  - `weekday(date: string): 0|1|2|3|4|5|6`
  - `addDays(date: string, n: number): string`
  - `addMinutes(instant: Date, min: number): Date`

- [ ] **Step 1: Write the failing tests:**
  - `zonedInstant('2026-11-24','10:00','Europe/Madrid').toISOString() === '2026-11-24T09:00:00.000Z'` (winter, UTC+1)
  - `zonedInstant('2026-07-14','10:00','Europe/Madrid').toISOString() === '2026-07-14T08:00:00.000Z'` (summer, UTC+2)
  - DST start: `zonedInstant('2026-03-29','10:00',tz)` → `'2026-03-29T08:00:00.000Z'`; DST end: `zonedInstant('2026-10-25','10:00',tz)` → `'2026-10-25T09:00:00.000Z'`
  - `localDate(new Date('2026-11-24T23:30:00Z'), tz) === '2026-11-25'`; `localTime` of the same → `'00:30'`
  - `weekday('2026-11-24') === 2`; `addDays('2026-12-31', 1) === '2027-01-01'`
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement with `@date-fns/tz` (`TZDate`). **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: time-zone helpers`.

### Task 4: Availability engine

**Files:**
- Create: `src/lib/availability.ts`
- Test: `tests/unit/availability.test.ts`

**Interfaces:**
- Consumes: Task 2 types, Task 3 helpers.
- Produces:
  - `type Busy = { barberId: string | null; start: Date; end: Date }` (`barberId: null` = whole salon; `end` already includes the booking's buffer)
  - `type Slot = { start: Date; barberIds: string[] }`
  - `getAvailableSlots(args: { config: SalonConfig; date: string; serviceId: string; barberId: string | 'any'; busy: Busy[]; now: Date; ignoreLimits?: boolean }): Slot[]` — sorted by start.
  - `isSlotAvailable(args: same as above + { start: Date; barberId: string }): boolean`
  - `pickBarber(candidates: string[], bookingsToday: Record<string, number>, config: SalonConfig): string` — fewest bookings that day, ties by config order.
  - `bookableDates(config: SalonConfig, now: Date): string[]` — today … today + `bookingWindowDays` (inclusive), salon-closed days removed.

Algorithm (not determined by the tests alone): for each barber who offers the service and works that weekday (not in `daysOff`, salon open), working window = salon hours ∩ barber hours. Candidate starts step by `slotStepMin` from the window's open time. A candidate is valid when `start + durationMin ≤ window close` and `[start, start + durationMin + bufferMin)` overlaps no `Busy` whose `barberId` is that barber or `null`. Unless `ignoreLimits`: drop `start < now + minNoticeMin` and dates after `bookableDates`' last day. Merge candidates across barbers by start time into `Slot.barberIds`.

- [ ] **Step 1: Write the failing tests** (fixture: demo config, `now = 2026-11-23T08:00:00Z`, a Monday):
  - `closed on Monday`: date `2026-11-23` → `[]`.
  - `scissor cut on an empty Tuesday with alvaro`: date `2026-11-24` → first start local `10:00`, last start local `19:15` (45 min ends 20:00), 38 slots.
  - `respects barber hours`: `iker` on `2026-11-24` → first local start `12:00`.
  - `respects day off`: `marco` on `2026-11-25` (Wednesday) → `[]`.
  - `existing booking blocks overlap plus buffer`: busy alvaro 11:00–11:50 local → no start from `10:15` to `11:45` (10:15 + 45 + 5 buffer = 11:05 overlaps); `10:10` and `11:50` offered.
  - `salon-wide block`: busy `{ barberId: null, 14:00–16:00 }` → no slot for any barber overlapping it.
  - `minimum notice`: `now = 2026-11-24T09:30:00Z` (10:30 local) → first alvaro slot `12:30`.
  - `booking window`: `bookableDates(config, now)` last element `<= '2026-12-23'`; `getAvailableSlots` for `2026-12-24` → `[]`; with `ignoreLimits: true` → non-empty.
  - `any barber merges`: `barberId: 'any'` on `2026-11-24` at local `12:00` → `barberIds` equal `['alvaro','marco','iker']`.
  - `DST days`: `2026-03-31` and `2026-10-27` (Tuesdays after the switches) → first slot local `10:00`, 38 slots each.
  - `pickBarber(['alvaro','iker'], { alvaro: 3, iker: 1 }, config) === 'iker'`; tie → `'alvaro'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: availability engine`.

### Task 5: Database schema and client

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`, `src/db/migrations/0000_init.sql` (generated), `src/db/migrations/0001_no_double_booking.sql` (hand-written), `tests/helpers/db.ts`
- Test: `tests/unit/db.test.ts`

**Interfaces:**
- Produces:
  - Tables:
    - `bookings`: `id uuid pk default gen_random_uuid()`, `token text unique not null`, `barber_id text not null`, `service_id text not null`, `service_name text not null`, `duration_min int not null`, `price_cents int not null`, `starts_at timestamptz not null`, `ends_at timestamptz not null` (start + duration), `occupied_until timestamptz not null` (ends_at + buffer), `customer_name text`, `customer_email text`, `customer_phone text`, `notes text`, `locale text not null`, `status text not null check in ('confirmed','cancelled','no_show')`, `source text not null check in ('online','admin')`, `created_at timestamptz default now()`, `cancelled_at timestamptz`, `anonymized_at timestamptz`.
    - `time_blocks`: `id uuid pk`, `barber_id text null`, `starts_at`, `ends_at`, `reason text`, `created_at`.
    - `rate_limits`: `key text`, `window_start timestamptz`, `count int`, pk (`key`,`window_start`).
    - `meta`: `key text pk`, `value text`.
  - `0001`: `CREATE EXTENSION IF NOT EXISTS btree_gist;` and `ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, occupied_until, '[)') WITH &&) WHERE (status <> 'cancelled');`
  - `type Db` (Drizzle instance); `getDb(): Promise<Db>` — postgres.js when `DATABASE_URL` is set, else a singleton PGlite stored in `process.env.PGLITE_DIR ?? '.data/pglite'` with `btree_gist` loaded; runs migrations once on first use. `.data/` is git-ignored.
  - `createTestDb(): Promise<Db>` — in-memory PGlite, migrated.

- [ ] **Step 1: Write the failing tests:** `overlapping confirmed bookings for one barber are rejected` (second insert throws with code `23P01`); `same time, different barber is fine`; `a cancelled booking does not block`; `back-to-back bookings (end == next start) are fine`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement schema, `drizzle-kit generate`, add `0001`, implement clients. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: database schema with no-double-booking constraint`.

### Task 6: Booking service

**Files:**
- Create: `src/server/bookings.ts`
- Test: `tests/unit/bookings.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces:
  - Errors: `class SlotTakenError`, `class NotFoundError`, `class CancelTooLateError`, `class BlockConflictError { bookings: BookingRow[] }`, `class ValidationError { field: string }`.
  - `type NewBooking = { serviceId: string; barberId: string | 'any'; start: Date; name: string; email?: string; phone?: string; notes?: string; locale: Locale }`
  - `createBooking(db: Db, input: NewBooking, opts: { now: Date; source: 'online' | 'admin'; config?: SalonConfig }): Promise<BookingRow>` — validates (online: email required, name 2–80 chars; admin: email optional), rechecks `isSlotAvailable` (with `ignoreLimits` for admin), snapshots service name/duration/price, generates a 32-byte base64url token, inserts; for `'any'` tries `pickBarber` order then the rest; maps `23P01` to `SlotTakenError`.
  - `getBookingByToken(db, token): Promise<BookingRow | null>`
  - `cancelBookingByToken(db, token, now): Promise<BookingRow>` — `NotFoundError` / `CancelTooLateError` (inside `cancelCutoffMin`); idempotent on already-cancelled.
  - `listBookings(db, range: { from: Date; to: Date }): Promise<BookingRow[]>`
  - `busyForDate(db, date: string, config): Promise<Busy[]>` (confirmed + no-show bookings and blocks for that local day)
  - Admin: `cancelBooking(db, id)`, `markNoShow(db, id)`, `moveBooking(db, id, { start: Date; barberId: string }, now)` (new slot checked, `SlotTakenError` on clash), `anonymizeBooking(db, id, now)` (nulls name/email/phone/notes, sets `anonymized_at`), `createBlock(db, { barberId: string | null; start; end; reason })` (throws `BlockConflictError` listing confirmed bookings inside), `deleteBlock(db, id)`.
  - `flagStaleBookings(rows: BookingRow[], config): Set<string>` — ids whose barber or service is no longer in config.

- [ ] **Step 1: Write the failing tests** (in-memory DB, demo config, `now = 2026-11-23T08:00:00Z`):
  - `creates a booking with a snapshot`: scissor cut, alvaro, `2026-11-24 10:00` local → row has `service_name 'Scissor cut'`, `price_cents 3200`, `duration_min 45`, `token.length >= 40`.
  - `concurrent submissions: exactly one wins`: two `createBooking` for the same barber/start via `Promise.allSettled` → one fulfilled, one rejected with `SlotTakenError`.
  - `any barber picks the least busy`: give alvaro two bookings that day, request `'any'` at 12:00 → assigned `marco`.
  - `online booking needs an email`: no email → `ValidationError` with `field 'email'`.
  - `rejects a start that is not an offered slot` (e.g. 10:07) → `SlotTakenError`.
  - `cancel by token`: cancels; then a new booking at the same time succeeds.
  - `cancel too late`: `now` = 1 h before start → `CancelTooLateError`.
  - `block conflict`: `createBlock` over an existing booking → `BlockConflictError` whose `bookings` contains it.
  - `anonymize`: personal fields null afterwards, `anonymized_at` set.
  - `flagStaleBookings`: a row with `barber_id 'ghost'` is flagged.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: booking service`.

### Task 7: Rate limiting, demo data, maintenance

**Files:**
- Create: `src/server/rate-limit.ts`, `src/server/demo.ts`, `src/server/maintenance.ts`, `src/app/api/cron/maintenance/route.ts`, `vercel.json`
- Test: `tests/unit/demo.test.ts`, `tests/unit/rate-limit.test.ts`

**Interfaces:**
- Produces:
  - `hitRateLimit(db, key: string, limit: number, windowMin: number, now: Date): Promise<{ allowed: boolean; retryAfterSec: number }>`
  - `isDemo(): boolean` (`process.env.DEMO_MODE === 'true'`)
  - `seedDemo(db, config, now): Promise<void>` — deletes all bookings/blocks, creates realistic confirmed bookings for the previous 2 and next 7 open days (≈40% of slots, deterministic seeded RNG, fictional names, emails `@example.com`), one salon block (a closed afternoon next week).
  - `maybeResetDemo(db, config, now): Promise<boolean>` — reseeds when `meta.demo_reset_at` is older than 60 min; guarded by `pg_advisory_xact_lock`; returns whether it ran.
  - `runMaintenance(db, config, now): Promise<{ anonymized: number; demoReset: boolean }>` — anonymises bookings that ended more than `retentionMonths` ago, then `maybeResetDemo` in demo mode.
  - `GET /api/cron/maintenance` — 401 unless `Authorization: Bearer ${CRON_SECRET}`.
  - `vercel.json`: `{ "crons": [{ "path": "/api/cron/maintenance", "schedule": "17 3 * * *" }] }`

- [ ] **Step 1: Write the failing tests:** limiter allows 5 then blocks the 6th within an hour and allows again in the next window; `seedDemo` creates bookings with no overlap (insert succeeds under the constraint) and every row passes `isSlotAvailable` against the others; `maybeResetDemo` returns `true` then `false` 10 min later, `true` 61 min later; `runMaintenance` anonymises a booking from 25 months ago and leaves one from 23 months ago.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: rate limiting, demo seed and maintenance job`.

### Task 8: Email

**Files:**
- Create: `src/server/email.ts`
- Test: `tests/unit/email.test.ts`

**Interfaces:**
- Produces:
  - `renderConfirmation(booking: BookingRow, config: SalonConfig, manageUrl: string): { subject: string; html: string; text: string }` — in `booking.locale`; includes salon name, service, barber name, local date/time, price, address and the manage link.
  - `sendConfirmation(booking, config, manageUrl): Promise<'sent' | 'logged' | 'skipped'>` — `'skipped'` in demo mode or when no email; `'logged'` when `RESEND_API_KEY` is unset (prints subject + recipient); otherwise Resend with `EMAIL_FROM`.

- [ ] **Step 1: Write the failing tests:** EN render subject `"Your appointment at Rizo Studio is confirmed"`, text contains `"Tuesday 24 November, 10:00"` and the manage URL; ES render subject `"Tu cita en Rizo Studio está confirmada"` and `"martes 24 de noviembre, 10:00"`; no API key → `'logged'`; `DEMO_MODE=true` → `'skipped'`.
- [ ] **Step 2–4:** Run → FAIL, implement, run → PASS.
- [ ] **Step 5:** Commit `feat: confirmation emails`.

### Task 9: i18n, theme and layout

**Files:**
- Create: `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/index.ts`, `src/app/[locale]/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/Header.tsx`, `src/components/LanguageSwitch.tsx`
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces:
  - `en` dictionary object (`as const`); `type Dict = typeof en`; `es: Dict` (TypeScript enforces the same keys).
  - `getDict(locale: Locale): Dict`; `formatPrice(cents, locale)`; `formatDateLong(date: string, locale)`; `formatTime(instant, tz)`.
  - Root `/` redirects to `/${config.defaultLocale}`; unknown locale → `notFound()`.
  - CSS variables `--ink --ivory --ivory-dim --accent --primary --primary-hover` written from `config.theme.colors` in the layout; fonts via `next/font/google` (Cormorant Garamond 400/500 + italic, Manrope 400/500/600).
  - `LanguageSwitch` keeps the current path and swaps the locale segment.

- [ ] **Step 1:** Failing tests: every leaf value in `es` is a non-empty string different from `''`; `formatPrice(3200,'es') === '32 €'`, `formatPrice(3200,'en') === '€32'`; `formatDateLong('2026-11-24','es') === 'martes, 24 de noviembre'`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat: i18n, theme tokens and layout`.

### Task 10: Homepage with the 3D hero

**Files:**
- Create: `src/lib/opening-status.ts`, `src/components/hero/HeroScene.tsx`, `src/components/hero/shader.ts`, `src/components/Marquee.tsx`, `src/components/CursorRing.tsx`, `src/app/[locale]/page.tsx`, sections `src/components/home/{Services,Barbers,Visit}.tsx`
- Test: `tests/unit/opening-status.test.ts`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `config.hero`, dictionaries.
- Produces: `openingStatus(now: Date, config): { open: boolean; label: { key: 'openUntil' | 'opensToday' | 'opensTomorrow' | 'opensOn'; time: string; weekday?: number } }`; `<HeroScene photo depth video? />` (client component).

Port `docs/prototype/hero.html` faithfully: the WebGL depth renderer (fixed-point parallax, bloom, LED sweep, vignette, intro), the video loaded with `fetch` → blob URL → texture (WebM if `canPlayType` VP9, else MP4), dust/air canvas, grain, headline line reveal + sheen, marquee, cursor ring, magnetic buttons, ES toggle. Keep the photo `<img>` as first paint and fallback (no WebGL, reduced motion, video error). Below the hero, add three calm sections (no WebGL): services with prices/durations, barbers (name, monogram, bio, services), visit (address, hours table, phone as selectable text). The primary CTA goes to `/[locale]/book`.

- [ ] **Step 1:** Failing unit tests: Tuesday 12:00 local → `{ open: true, key 'openUntil', time '20:00' }`; Tuesday 09:00 → `opensToday 10:00`; Saturday 21:00 → `opensOn` weekday 2; Wednesday 20:30 → `opensTomorrow`.
- [ ] **Step 2:** Failing e2e: `/en` shows heading "The art of the cut."; clicking `ES` → URL `/es` and heading "El arte del corte."; "Reserve your chair" navigates to `/en/book`; with `reducedMotion: 'reduce'` the hero `<img>` is visible and `<html>` does not have class `gl-ready`; phone project: no horizontal scroll (`scrollWidth <= clientWidth`).
- [ ] **Step 3:** Implement. **Step 4:** `npm test && npm run e2e -- tests/e2e/home.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat: animated 3D homepage`.

### Task 11: Booking flow

**Files:**
- Create: `src/app/api/availability/route.ts`, `src/app/[locale]/book/page.tsx`, `src/app/[locale]/book/BookingForm.tsx`, `src/app/[locale]/book/actions.ts`
- Test: `tests/e2e/book.spec.ts`

**Interfaces:**
- Consumes: `getAvailableSlots`, `busyForDate`, `createBooking`, `hitRateLimit`, `sendConfirmation`, `maybeResetDemo`.
- Produces:
  - `GET /api/availability?date=YYYY-MM-DD&service=ID&barber=ID|any` → `{ slots: { start: string (ISO); time: string ("HH:mm") }[] }`; 400 on bad params.
  - Server action `submitBooking(formData): Promise<{ ok: true; token: string } | { ok: false; error: 'slotTaken' | 'rateLimited' | 'validation'; field?: string }>` — honeypot field `company` non-empty → pretend success without inserting; rate limit key `book:${ip}` with `config.rateLimitPerHour` per 60 min.

Steps in the form (one screen each on phone, a progress line on top): service → barber (or "Any barber") → date (horizontal strip from `bookableDates`) → time (grid of slots) → details (name, email, phone optional, notes optional, consent checkbox linking `/[locale]/privacy`) → confirm. On success redirect to `/[locale]/booking/[token]`. On `slotTaken` show "This time was just taken — here are the next free times" and refetch slots.

- [ ] **Step 1:** Failing e2e (phone project): pick Scissor cut → Any barber → first available date → first slot → fill name/email, tick consent → confirm → lands on `/en/booking/...` with "You're booked"; going back to the same date shows that slot gone for the assigned barber when that barber is selected; submitting without consent shows "Please accept the privacy policy"; the whole flow completes within 60 s of test time.
- [ ] **Step 2:** Failing e2e `slot taken`: open the form in two pages, both choose the same barber/slot, submit both → one confirmation, the other shows the "just taken" message and a refreshed slot list.
- [ ] **Step 3:** Implement. **Step 4:** Run e2e → PASS.
- [ ] **Step 5:** Commit `feat: booking flow`.

### Task 12: Manage-booking page

**Files:**
- Create: `src/lib/manage-state.ts`, `src/app/[locale]/booking/[token]/page.tsx`, `src/app/[locale]/booking/[token]/actions.ts`
- Test: `tests/unit/manage-state.test.ts`, `tests/e2e/manage.spec.ts`

**Interfaces:**
- Consumes: `getBookingByToken`, `cancelBookingByToken`, `renderConfirmation`.
- Produces: `manageViewState(booking: BookingRow | null, now: Date, config): 'confirmed' | 'cancelled' | 'tooLate' | 'anonymized' | 'unknown'` (pure, in `src/lib/manage-state.ts`) and page states `confirmed` (details, add-to-calendar `.ics` download link served by `GET /[locale]/booking/[token]/ics`, Cancel button with an inline confirm step), `cancelled`, `tooLate` (call the salon, phone shown as text), `anonymized`, `unknown` (404 page with a link home). In demo mode a "Demo: this is the email the customer would receive" panel renders `renderConfirmation().html` in a sandboxed `<iframe srcdoc>`.

- [ ] **Step 1:** Failing tests. Unit (`tests/unit/manage-state.test.ts`): `null` → `'unknown'`; cancelled row → `'cancelled'`; start 60 min after `now` → `'tooLate'`; start 3 h after → `'confirmed'`; `anonymized_at` set → `'anonymized'`. E2E: book a slot, open its link, cancel → "Your appointment is cancelled" and the slot is offered again; random token → "We couldn't find this booking".
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat: manage booking page`.

### Task 13: Admin authentication

**Files:**
- Create: `src/server/auth.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`, `src/app/admin/(protected)/layout.tsx`, `scripts/hash-password.mjs`
- Test: `tests/unit/auth.test.ts`, `tests/e2e/admin-auth.spec.ts`

**Interfaces:**
- Produces:
  - `verifyPassword(email: string, password: string): Promise<boolean>` (constant-time email compare, bcrypt against `ADMIN_PASSWORD_HASH`).
  - `createSession(): Promise<string>` / `readSession(cookie?: string): Promise<{ sub: 'admin' } | null>` — HS256 JWT with `SESSION_SECRET`, 12 h expiry; cookie `rizo_admin`, `httpOnly`, `secure` in production, `sameSite: 'lax'`, `path: '/admin'`.
  - `requireAdmin()` used by the protected layout (redirects to `/admin/login`).
  - Login rate limit key `login:${ip}`: 10 per 15 min.
  - In demo mode the login page shows the demo credentials (`demo@rizostudio.example` / value of `DEMO_ADMIN_PASSWORD`, defaulting to `rizo-demo`).
  - `node scripts/hash-password.mjs <password>` prints a bcrypt hash for `.env`.

- [ ] **Step 1:** Failing tests: session round-trip; expired token → `null`; tampered token → `null`; e2e wrong password → "Wrong email or password", right password → dashboard heading "Today"; `/admin` without cookie redirects to `/admin/login`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat: admin authentication`.

### Task 14: Admin dashboard

**Files:**
- Create: `src/app/admin/(protected)/page.tsx` (day view), `.../week/page.tsx`, `.../bookings/[id]/page.tsx`, `.../new/page.tsx`, `.../blocks/page.tsx`, `.../actions.ts`, `src/components/admin/{DayGrid,WeekGrid,BookingCard}.tsx`
- Test: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: Task 6 admin functions, `getAvailableSlots` with `ignoreLimits: true`.
- Produces: day view (columns per barber, rows every 15 min, booking cards with time, service, customer, status chip; stale bookings flagged "Barber/service no longer offered"); week view (counts per barber per day); booking detail with actions Cancel / Mark no-show / Move (date + barber + slot picker) / Delete customer data (two-step confirm); new booking form (phone/walk-in, email optional, source `admin`); blocks page (list, add with barber or "Whole salon", delete). Errors surface inline: `SlotTakenError` → "That time is taken", `BlockConflictError` → "These bookings are in that period:" + list.

- [ ] **Step 1:** Failing e2e: admin creates a phone booking for Iker tomorrow 12:00 → appears in day view; public `/en/book` for Iker that day no longer offers 12:00; admin adds a whole-salon block tomorrow 15:00–17:00 → public slots in that range disappear; adding a block over the phone booking → conflict message lists it; move the booking to 13:00 → day view shows 13:00; mark no-show → status chip "No-show".
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat: admin dashboard`.

### Task 15: Privacy page, README and release check

**Files:**
- Create: `src/app/[locale]/privacy/page.tsx`, `README.md`, `docs/screenshots/*.png`
- Modify: `.env.example` if anything new appeared

**Interfaces:**
- Produces: privacy page generated from `config.legalName`, `config.address`, `config.email`, `retentionMonths` in EN/ES, with a visible note in the README that the text is a template, not legal advice.

- [ ] **Step 1:** e2e: `/es/privacy` contains "Rizo Studio S.L." and "24 meses".
- [ ] **Step 2:** README (English): what it is, live demo link placeholder, screenshots (home desktop + phone, booking, admin), features, tech stack, "Customise for a new salon" (edit `salon.config.ts`, replace `public/hero/*`, `npm run dev`), "Deploy" (Neon database, Vercel project, environment variables, `vercel.json` cron, Resend domain verification), "Run tests", licence MIT (add `LICENSE`).
- [ ] **Step 3:** Screenshots with Playwright at `deviceScaleFactor: 2` into `docs/screenshots/`.
- [ ] **Step 4:** Release check: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e` → all pass.
- [ ] **Step 5:** Commit `docs: privacy page, README and screenshots`; push the branch.

Deployment itself (creating Neon/Vercel/Resend accounts, setting env vars, connecting the domain) is NOT part of this plan: Claude asks Ziad before touching any outside service.
