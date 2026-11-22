import { randomBytes } from "node:crypto";
import { and, asc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import defaultConfig from "@config";
import type { Locale, SalonConfig } from "@/config/schema";
import { getAvailableSlots, isSlotAvailable, pickBarber, type Busy } from "@/lib/availability";
import { addDays, addMinutes, localDate, zonedInstant, type LocalDate } from "@/lib/time";
import type { Db } from "@/db/client";
import { bookings, timeBlocks, type BookingRow, type TimeBlockRow } from "@/db/schema";

export type { BookingRow, TimeBlockRow };

export class SlotTakenError extends Error {
  constructor() { super("This time was just taken"); this.name = "SlotTakenError"; }
}
export class NotFoundError extends Error {
  constructor() { super("Booking not found"); this.name = "NotFoundError"; }
}
export class CancelTooLateError extends Error {
  constructor() { super("Too late to cancel online"); this.name = "CancelTooLateError"; }
}
export class ValidationError extends Error {
  constructor(public field: string) { super(`Invalid ${field}`); this.name = "ValidationError"; }
}
export class BlockConflictError extends Error {
  constructor(public bookings: BookingRow[]) { super("Bookings exist in that period"); this.name = "BlockConflictError"; }
}

export type NewBooking = {
  serviceId: string;
  barberId: string | "any";
  start: Date;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  locale: Locale;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACTIVE = ["confirmed", "no_show"] as const;

/** True when a database error is the "no double booking" exclusion constraint. */
function isOverlapError(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23P01" || err?.cause?.code === "23P01";
}

function dayRange(date: LocalDate, tz: string) {
  return { from: zonedInstant(date, "00:00", tz), to: zonedInstant(addDays(date, 1), "00:00", tz) };
}

function validate(input: NewBooking, source: "online" | "admin", config: SalonConfig) {
  const name = input.name?.trim() ?? "";
  if (name.length < 2 || name.length > 80) throw new ValidationError("name");
  const email = input.email?.trim() || undefined;
  if (source === "online" && !email) throw new ValidationError("email");
  if (email && (!EMAIL.test(email) || email.length > 200)) throw new ValidationError("email");
  const phone = input.phone?.trim() || undefined;
  if (phone && phone.length > 30) throw new ValidationError("phone");
  const notes = input.notes?.trim() || undefined;
  if (notes && notes.length > 500) throw new ValidationError("notes");
  const service = config.services.find((s) => s.id === input.serviceId);
  if (!service) throw new ValidationError("serviceId");
  if (input.barberId !== "any" && !config.barbers.some((b) => b.id === input.barberId)) throw new ValidationError("barberId");
  if (!config.locales.includes(input.locale)) throw new ValidationError("locale");
  return { name, email, phone, notes, service };
}

/** Bookings and blocks that make barbers unavailable on a salon-local day. */
export async function busyForDate(db: Db, date: LocalDate, config: SalonConfig = defaultConfig, excludeBookingId?: string): Promise<Busy[]> {
  const { from, to } = dayRange(date, config.timezone);
  const rows = await db.select().from(bookings).where(and(
    inArray(bookings.status, [...ACTIVE]), lt(bookings.startsAt, to), gt(bookings.occupiedUntil, from),
    excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
  ));
  const blocks = await db.select().from(timeBlocks).where(and(lt(timeBlocks.startsAt, to), gt(timeBlocks.endsAt, from)));
  return [
    ...rows.map((r) => ({ barberId: r.barberId, start: r.startsAt, end: r.occupiedUntil })),
    ...blocks.map((b) => ({ barberId: b.barberId, start: b.startsAt, end: b.endsAt })),
  ];
}

export async function createBooking(
  db: Db,
  input: NewBooking,
  opts: { now: Date; source: "online" | "admin"; config?: SalonConfig },
): Promise<BookingRow> {
  const config = opts.config ?? defaultConfig;
  const v = validate(input, opts.source, config);
  const date = localDate(input.start, config.timezone);
  const busy = await busyForDate(db, date, config);
  const query = { config, date, serviceId: v.service.id, busy, now: opts.now, ignoreLimits: opts.source === "admin" };

  let candidates: string[];
  if (input.barberId === "any") {
    const slot = getAvailableSlots({ ...query, barberId: "any" }).find((s) => s.start.getTime() === input.start.getTime());
    if (!slot) throw new SlotTakenError();
    const counts: Record<string, number> = {};
    for (const b of busy) if (b.barberId) counts[b.barberId] = (counts[b.barberId] ?? 0) + 1;
    const first = pickBarber(slot.barberIds, counts, config);
    candidates = [first, ...slot.barberIds.filter((id) => id !== first)];
  } else {
    if (!isSlotAvailable({ ...query, barberId: input.barberId, start: input.start })) throw new SlotTakenError();
    candidates = [input.barberId];
  }

  const endsAt = addMinutes(input.start, v.service.durationMin);
  for (const barberId of candidates) {
    try {
      const [row] = await db.insert(bookings).values({
        token: randomBytes(32).toString("base64url"),
        barberId,
        serviceId: v.service.id,
        serviceName: v.service.name.en,
        durationMin: v.service.durationMin,
        priceCents: v.service.priceCents,
        startsAt: input.start,
        endsAt,
        occupiedUntil: addMinutes(endsAt, v.service.bufferMin),
        customerName: v.name,
        customerEmail: v.email ?? null,
        customerPhone: v.phone ?? null,
        notes: v.notes ?? null,
        locale: input.locale,
        status: "confirmed",
        source: opts.source,
      }).returning();
      return row;
    } catch (e) {
      if (!isOverlapError(e)) throw e;
    }
  }
  throw new SlotTakenError();
}

export async function getBookingByToken(db: Db, token: string): Promise<BookingRow | null> {
  const [row] = await db.select().from(bookings).where(eq(bookings.token, token)).limit(1);
  return row ?? null;
}

export async function getBookingById(db: Db, id: string): Promise<BookingRow | null> {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return row ?? null;
}

export async function cancelBookingByToken(db: Db, token: string, now: Date, config: SalonConfig = defaultConfig): Promise<BookingRow> {
  const b = await getBookingByToken(db, token);
  if (!b) throw new NotFoundError();
  if (b.status === "cancelled") return b;
  if (b.startsAt.getTime() - now.getTime() < config.cancelCutoffMin * 60_000) throw new CancelTooLateError();
  const [row] = await db.update(bookings).set({ status: "cancelled", cancelledAt: now }).where(eq(bookings.id, b.id)).returning();
  return row;
}

export async function listBookings(db: Db, range: { from: Date; to: Date }): Promise<BookingRow[]> {
  return db.select().from(bookings)
    .where(and(lt(bookings.startsAt, range.to), gt(bookings.endsAt, range.from)))
    .orderBy(asc(bookings.startsAt));
}

export async function listBlocks(db: Db, range: { from: Date; to: Date }): Promise<TimeBlockRow[]> {
  return db.select().from(timeBlocks)
    .where(and(lt(timeBlocks.startsAt, range.to), gt(timeBlocks.endsAt, range.from)))
    .orderBy(asc(timeBlocks.startsAt));
}

async function setStatus(db: Db, id: string, set: Partial<typeof bookings.$inferInsert>): Promise<BookingRow> {
  const [row] = await db.update(bookings).set(set).where(eq(bookings.id, id)).returning();
  if (!row) throw new NotFoundError();
  return row;
}

export const cancelBooking = (db: Db, id: string, now = new Date()) => setStatus(db, id, { status: "cancelled", cancelledAt: now });
export const markNoShow = (db: Db, id: string) => setStatus(db, id, { status: "no_show" });

export async function moveBooking(db: Db, id: string, to: { start: Date; barberId: string }, now: Date, config: SalonConfig = defaultConfig): Promise<BookingRow> {
  const b = await getBookingById(db, id);
  if (!b) throw new NotFoundError();
  const service = config.services.find((s) => s.id === b.serviceId);
  const durationMin = service?.durationMin ?? b.durationMin;
  const bufferMin = service?.bufferMin ?? 0;
  const date = localDate(to.start, config.timezone);
  const busy = await busyForDate(db, date, config, b.id);
  if (service && !isSlotAvailable({ config, date, serviceId: service.id, barberId: to.barberId, start: to.start, busy, now, ignoreLimits: true })) {
    throw new SlotTakenError();
  }
  const endsAt = addMinutes(to.start, durationMin);
  try {
    return await setStatus(db, id, { barberId: to.barberId, startsAt: to.start, endsAt, occupiedUntil: addMinutes(endsAt, bufferMin), status: "confirmed" });
  } catch (e) {
    if (isOverlapError(e)) throw new SlotTakenError();
    throw e;
  }
}

export const anonymizeBooking = (db: Db, id: string, now: Date) =>
  setStatus(db, id, { customerName: null, customerEmail: null, customerPhone: null, notes: null, anonymizedAt: now });

export async function createBlock(db: Db, block: { barberId: string | null; start: Date; end: Date; reason: string | null }): Promise<TimeBlockRow> {
  if (block.end <= block.start) throw new ValidationError("end");
  const clash = await db.select().from(bookings).where(and(
    eq(bookings.status, "confirmed"), lt(bookings.startsAt, block.end), gt(bookings.occupiedUntil, block.start),
    block.barberId ? eq(bookings.barberId, block.barberId) : undefined,
  )).orderBy(asc(bookings.startsAt));
  if (clash.length) throw new BlockConflictError(clash);
  const [row] = await db.insert(timeBlocks).values({ barberId: block.barberId, startsAt: block.start, endsAt: block.end, reason: block.reason }).returning();
  return row;
}

export async function deleteBlock(db: Db, id: string): Promise<void> {
  await db.delete(timeBlocks).where(eq(timeBlocks.id, id));
}

/** Ids of bookings whose barber or service is no longer in the configuration. */
export function flagStaleBookings(rows: BookingRow[], config: SalonConfig = defaultConfig): Set<string> {
  const barbers = new Set(config.barbers.map((b) => b.id));
  const services = new Set(config.services.map((s) => s.id));
  return new Set(rows.filter((r) => !barbers.has(r.barberId) || !services.has(r.serviceId)).map((r) => r.id));
}

