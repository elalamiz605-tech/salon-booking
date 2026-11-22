import { eq, sql } from "drizzle-orm";
import type { SalonConfig } from "@/config/schema";
import type { Db } from "@/db/client";
import { bookings, meta, timeBlocks } from "@/db/schema";
import { getAvailableSlots, type Busy } from "@/lib/availability";
import { addDays, addMinutes, localDate, weekday, zonedInstant, type LocalDate } from "@/lib/time";
import { randomBytes } from "node:crypto";

export const isDemo = () => process.env.DEMO_MODE === "true";

const FIRST = ["Carlos", "Javier", "Pablo", "Diego", "Sergio", "Hugo", "Mateo", "Lucas", "Daniel", "Adrián", "Marcos", "Andrés", "Tomás", "Iván", "Rubén", "Óscar"];
const LAST = ["García", "Martín", "López", "Sánchez", "Romero", "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Gil", "Serrano", "Molina", "Ortega"];

/** Small deterministic random generator, so the demo looks the same after every reset. */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function openDaysAround(config: SalonConfig, today: LocalDate, before: number, after: number): LocalDate[] {
  const out: LocalDate[] = [];
  for (let i = -1, n = 0; n < before && i > -30; i--) { const d = addDays(today, i); if (config.openingHours[weekday(d)]) { out.unshift(d); n++; } }
  for (let i = 0, n = 0; n < after && i < 30; i++) { const d = addDays(today, i); if (config.openingHours[weekday(d)]) { out.push(d); n++; } }
  return out;
}

/** Replaces all bookings and blocks with a realistic week of demo data. */
export async function seedDemo(db: Db, config: SalonConfig, now: Date): Promise<void> {
  await db.delete(bookings);
  await db.delete(timeBlocks);
  const random = rng(20261124);
  const today = localDate(now, config.timezone);
  const days = openDaysAround(config, today, 2, 7);

  // One closed afternoon next week, so the admin calendar shows a block.
  const blockDay = days.find((d) => d > addDays(today, 5)) ?? days.at(-1)!;
  const busy: Busy[] = [{ barberId: null, start: zonedInstant(blockDay, "16:00", config.timezone), end: zonedInstant(blockDay, "20:00", config.timezone) }];
  await db.insert(timeBlocks).values({ barberId: null, startsAt: busy[0].start, endsAt: busy[0].end, reason: "Staff training" });

  const rows: (typeof bookings.$inferInsert)[] = [];
  for (const date of days) {
    for (const barber of config.barbers) {
      let cursor = zonedInstant(date, "00:00", config.timezone);
      for (let guard = 0; guard < 40; guard++) {
        const serviceId = barber.serviceIds[Math.floor(random() * barber.serviceIds.length)];
        const service = config.services.find((s) => s.id === serviceId)!;
        const slots = getAvailableSlots({ config, date, serviceId: service.id, barberId: barber.id, busy, now, ignoreLimits: true })
          .filter((s) => s.start >= cursor);
        if (!slots.length) break;
        const pick = slots[Math.min(slots.length - 1, Math.floor(random() * 3))];
        cursor = addMinutes(pick.start, service.durationMin + service.bufferMin);
        if (random() > 0.55) continue; // leave ~45% of the day free
        const first = FIRST[Math.floor(random() * FIRST.length)];
        const last = LAST[Math.floor(random() * LAST.length)];
        const endsAt = addMinutes(pick.start, service.durationMin);
        const occupiedUntil = addMinutes(endsAt, service.bufferMin);
        busy.push({ barberId: barber.id, start: pick.start, end: occupiedUntil });
        rows.push({
          token: randomBytes(32).toString("base64url"), barberId: barber.id, serviceId: service.id, serviceName: service.name.en,
          durationMin: service.durationMin, priceCents: service.priceCents, startsAt: pick.start, endsAt, occupiedUntil,
          customerName: `${first} ${last}`,
          customerEmail: `${first}.${last}`.normalize("NFD").replace(/[^\w.]/g, "").toLowerCase() + "@example.com",
          customerPhone: `+34 6${String(Math.floor(random() * 1e8)).padStart(8, "0")}`,
          locale: random() < 0.7 ? "es" : "en",
          status: date < today && random() < 0.08 ? "no_show" : "confirmed",
          source: random() < 0.25 ? "admin" : "online",
        });
      }
    }
  }
  if (rows.length) await db.insert(bookings).values(rows);
}

const RESET_KEY = "demo_reset_at";

/** Reseeds the demo when the last reset is more than an hour old. Returns whether it ran. */
export async function maybeResetDemo(db: Db, config: SalonConfig, now: Date): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(4242)`);
    const [row] = await tx.select().from(meta).where(eq(meta.key, RESET_KEY));
    if (row && now.getTime() - new Date(row.value).getTime() < 60 * 60_000) return false;
    await seedDemo(tx as unknown as Db, config, now);
    await tx.insert(meta).values({ key: RESET_KEY, value: now.toISOString() })
      .onConflictDoUpdate({ target: meta.key, set: { value: now.toISOString() } });
    return true;
  });
}
