import { and, isNull, lt } from "drizzle-orm";
import type { SalonConfig } from "@/config/schema";
import type { Db } from "@/db/client";
import { bookings, rateLimits } from "@/db/schema";
import { isDemo, maybeResetDemo } from "@/server/demo";

/** Daily job: anonymise customers past the retention period, tidy rate limits, reset the demo. */
export async function runMaintenance(db: Db, config: SalonConfig, now: Date): Promise<{ anonymized: number; demoReset: boolean }> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - config.retentionMonths);
  const anonymized = await db.update(bookings)
    .set({ customerName: null, customerEmail: null, customerPhone: null, notes: null, anonymizedAt: now })
    .where(and(lt(bookings.endsAt, cutoff), isNull(bookings.anonymizedAt)))
    .returning({ id: bookings.id });
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - 24 * 60 * 60_000)));
  const demoReset = isDemo() ? await maybeResetDemo(db, config, now) : false;
  return { anonymized: anonymized.length, demoReset };
}
