import config from "@config";
import { siteDb as getDb } from "@/server/site";
import { addDays, localDate, zonedInstant, type LocalDate } from "@/lib/time";
import { flagStaleBookings, listBlocks, listBookings } from "@/server/bookings";

export const today = (): LocalDate => localDate(new Date(), config.timezone);
export const parseDate = (v: string | undefined): LocalDate => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : today());

/** Everything the day view needs for one salon-local date. */
export async function dayData(date: LocalDate) {
  const db = await getDb();
  const range = { from: zonedInstant(date, "00:00", config.timezone), to: zonedInstant(addDays(date, 1), "00:00", config.timezone) };
  const [bookings, blocks] = await Promise.all([listBookings(db, range), listBlocks(db, range)]);
  return { bookings, blocks, stale: flagStaleBookings(bookings, config) };
}
