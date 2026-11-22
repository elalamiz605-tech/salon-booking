import { beforeEach, describe, expect, test } from "vitest";
import { bookings } from "@/db/schema";
import { createTestDb } from "../helpers/db";
import type { Db } from "@/db/client";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const row = (over: Partial<typeof bookings.$inferInsert> = {}): typeof bookings.$inferInsert => ({
  token: crypto.randomUUID() + crypto.randomUUID(),
  barberId: "alvaro",
  serviceId: "scissor-cut",
  serviceName: "Scissor cut",
  durationMin: 45,
  priceCents: 3200,
  startsAt: new Date("2026-11-24T09:00:00Z"),
  endsAt: new Date("2026-11-24T09:45:00Z"),
  occupiedUntil: new Date("2026-11-24T09:50:00Z"),
  customerName: "Test",
  customerEmail: "t@example.com",
  locale: "en",
  status: "confirmed",
  source: "online",
  ...over,
});

const pgCode = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    return err.code ?? err.cause?.code ?? "unknown";
  }
};

describe("no double booking constraint", () => {
  test("overlapping confirmed bookings for one barber are rejected", async () => {
    await db.insert(bookings).values(row());
    const code = await pgCode(db.insert(bookings).values(row({ startsAt: new Date("2026-11-24T09:30:00Z"), endsAt: new Date("2026-11-24T10:15:00Z"), occupiedUntil: new Date("2026-11-24T10:20:00Z") })));
    expect(code).toBe("23P01");
  });

  test("same time, different barber is fine", async () => {
    await db.insert(bookings).values(row());
    expect(await pgCode(db.insert(bookings).values(row({ barberId: "marco" })))).toBeNull();
  });

  test("a cancelled booking does not block", async () => {
    await db.insert(bookings).values(row({ status: "cancelled" }));
    expect(await pgCode(db.insert(bookings).values(row()))).toBeNull();
  });

  test("back-to-back bookings are fine", async () => {
    await db.insert(bookings).values(row());
    const next = row({ startsAt: new Date("2026-11-24T09:50:00Z"), endsAt: new Date("2026-11-24T10:35:00Z"), occupiedUntil: new Date("2026-11-24T10:40:00Z") });
    expect(await pgCode(db.insert(bookings).values(next))).toBeNull();
  });
});
