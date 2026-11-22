import { describe, expect, test } from "vitest";
import config from "@config";
import { createTestDb } from "../helpers/db";
import { maybeResetDemo, seedDemo } from "@/server/demo";
import { runMaintenance } from "@/server/maintenance";
import { listBookings } from "@/server/bookings";
import { bookings } from "@/db/schema";

const NOW = new Date("2026-11-23T08:00:00Z");

describe("demo data", () => {
  test("seed creates realistic, non-overlapping bookings", async () => {
    const db = await createTestDb();
    await seedDemo(db, config, NOW);
    const rows = await listBookings(db, { from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-12-31T00:00:00Z") });
    expect(rows.length).toBeGreaterThan(30);
    expect(rows.every((r) => r.customerEmail?.endsWith("@example.com"))).toBe(true);
    const byBarber = new Map<string, typeof rows>();
    for (const r of rows) byBarber.set(r.barberId, [...(byBarber.get(r.barberId) ?? []), r]);
    for (const list of byBarber.values()) {
      for (let i = 1; i < list.length; i++) expect(list[i].startsAt >= list[i - 1].occupiedUntil).toBe(true);
    }
  });

  test("reset runs at most once an hour", async () => {
    const db = await createTestDb();
    expect(await maybeResetDemo(db, config, NOW)).toBe(true);
    expect(await maybeResetDemo(db, config, new Date(NOW.getTime() + 10 * 60_000))).toBe(false);
    expect(await maybeResetDemo(db, config, new Date(NOW.getTime() + 61 * 60_000))).toBe(true);
  });
});

describe("maintenance", () => {
  test("anonymizes bookings older than the retention period", async () => {
    const db = await createTestDb();
    const old = new Date("2024-10-22T09:00:00Z"); // 25 months before NOW
    const recent = new Date("2024-12-24T09:00:00Z"); // 23 months before NOW
    for (const start of [old, recent]) {
      await db.insert(bookings).values({
        token: crypto.randomUUID() + start.getTime(), barberId: "alvaro", serviceId: "scissor-cut", serviceName: "Scissor cut",
        durationMin: 45, priceCents: 3200, startsAt: start, endsAt: new Date(start.getTime() + 45 * 60_000),
        occupiedUntil: new Date(start.getTime() + 50 * 60_000), customerName: "Old", customerEmail: "o@example.com",
        locale: "en", status: "confirmed", source: "online",
      });
    }
    const res = await runMaintenance(db, config, NOW);
    expect(res.anonymized).toBe(1);
    const rows = await listBookings(db, { from: new Date("2024-01-01T00:00:00Z"), to: new Date("2025-06-01T00:00:00Z") });
    expect(rows.map((r) => r.customerName)).toEqual([null, "Old"]);
  });
});
