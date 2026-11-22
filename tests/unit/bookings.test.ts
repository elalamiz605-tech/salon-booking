import { beforeEach, describe, expect, test } from "vitest";
import config from "@config";
import type { Db } from "@/db/client";
import { createTestDb } from "../helpers/db";
import {
  BlockConflictError, CancelTooLateError, SlotTakenError, ValidationError,
  anonymizeBooking, busyForDate, cancelBookingByToken, createBlock, createBooking, flagStaleBookings, getBookingByToken,
  type NewBooking,
} from "@/server/bookings";
import { zonedInstant } from "@/lib/time";

const NOW = new Date("2026-11-23T08:00:00Z");
const at = (hhmm: string, date = "2026-11-24") => zonedInstant(date, hhmm, config.timezone);
let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const input = (over: Partial<NewBooking> = {}): NewBooking => ({
  serviceId: "scissor-cut", barberId: "alvaro", start: at("10:00"),
  name: "Carlos Ruiz", email: "carlos@example.com", locale: "en", ...over,
});
const online = { now: NOW, source: "online" as const };

describe("createBooking", () => {
  test("creates a booking with a snapshot of the service", async () => {
    const b = await createBooking(db, input(), online);
    expect(b.serviceName).toBe("Scissor cut");
    expect(b.priceCents).toBe(3200);
    expect(b.durationMin).toBe(45);
    expect(b.token.length).toBeGreaterThanOrEqual(40);
    expect(b.occupiedUntil.toISOString()).toBe(new Date(at("10:00").getTime() + 50 * 60_000).toISOString());
  });

  test("concurrent submissions: exactly one wins", async () => {
    const results = await Promise.allSettled([createBooking(db, input(), online), createBooking(db, input({ email: "other@example.com" }), online)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(SlotTakenError);
  });

  test("any barber picks the least busy", async () => {
    await createBooking(db, input({ start: at("10:00") }), online);
    await createBooking(db, input({ start: at("11:00") }), online);
    const b = await createBooking(db, input({ barberId: "any", start: at("12:00") }), online);
    expect(b.barberId).toBe("marco");
  });

  test("any barber falls back when the first choice is taken", async () => {
    await createBooking(db, input({ barberId: "marco", start: at("12:00") }), online);
    await createBooking(db, input({ barberId: "iker", start: at("12:00") }), online);
    const b = await createBooking(db, input({ barberId: "any", start: at("12:00") }), online);
    expect(b.barberId).toBe("alvaro");
  });

  test("online booking needs an email", async () => {
    await expect(createBooking(db, input({ email: undefined }), online)).rejects.toMatchObject({ field: "email" });
    await expect(createBooking(db, input({ email: undefined }), online)).rejects.toBeInstanceOf(ValidationError);
  });

  test("admin booking works without email and ignores minimum notice", async () => {
    const b = await createBooking(db, input({ email: undefined, start: at("10:00", "2026-11-24") }), { now: new Date("2026-11-24T08:50:00Z"), source: "admin" });
    expect(b.source).toBe("admin");
  });

  test("rejects a start that is not an offered slot", async () => {
    await expect(createBooking(db, input({ start: at("10:07") }), online)).rejects.toBeInstanceOf(SlotTakenError);
  });

  test("rejects a name that is too short", async () => {
    await expect(createBooking(db, input({ name: "A" }), online)).rejects.toMatchObject({ field: "name" });
  });
});

describe("cancel and blocks", () => {
  test("cancel by token frees the slot", async () => {
    const b = await createBooking(db, input(), online);
    const c = await cancelBookingByToken(db, b.token, NOW);
    expect(c.status).toBe("cancelled");
    await expect(createBooking(db, input(), online)).resolves.toBeTruthy();
  });

  test("cancelling twice is harmless", async () => {
    const b = await createBooking(db, input(), online);
    await cancelBookingByToken(db, b.token, NOW);
    await expect(cancelBookingByToken(db, b.token, NOW)).resolves.toMatchObject({ status: "cancelled" });
  });

  test("cancel too late", async () => {
    const b = await createBooking(db, input(), online);
    await expect(cancelBookingByToken(db, b.token, new Date(at("10:00").getTime() - 60 * 60_000))).rejects.toBeInstanceOf(CancelTooLateError);
  });

  test("unknown token returns null", async () => {
    expect(await getBookingByToken(db, "nope")).toBeNull();
  });

  test("block conflict lists the bookings inside", async () => {
    const b = await createBooking(db, input(), online);
    const err = await createBlock(db, { barberId: null, start: at("09:30"), end: at("11:00"), reason: "Closed" }).catch((e) => e);
    expect(err).toBeInstanceOf(BlockConflictError);
    expect((err as BlockConflictError).bookings.map((x) => x.id)).toEqual([b.id]);
  });

  test("blocks appear as busy time", async () => {
    await createBlock(db, { barberId: "iker", start: at("15:00"), end: at("16:00"), reason: null });
    const busy = await busyForDate(db, "2026-11-24", config);
    expect(busy).toContainEqual({ barberId: "iker", start: at("15:00"), end: at("16:00") });
  });

  test("anonymize clears personal data", async () => {
    const b = await createBooking(db, input({ phone: "600000000", notes: "hi" }), online);
    const a = await anonymizeBooking(db, b.id, NOW);
    expect([a.customerName, a.customerEmail, a.customerPhone, a.notes]).toEqual([null, null, null, null]);
    expect(a.anonymizedAt).toEqual(NOW);
  });

  test("flags bookings whose barber or service left the config", async () => {
    const b = await createBooking(db, input(), online);
    const ghost = { ...b, id: "x", barberId: "ghost" };
    expect([...flagStaleBookings([b, ghost], config)]).toEqual(["x"]);
  });
});
