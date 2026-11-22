import { TZDate } from "@date-fns/tz";
import type { Weekday } from "@/config/schema";

/** A calendar date in the salon's time zone, written "YYYY-MM-DD". */
export type LocalDate = string;

const pad = (n: number) => String(n).padStart(2, "0");

/** The instant at which the salon's wall clock shows `hhmm` on `date`. */
export function zonedInstant(date: LocalDate, hhmm: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, h, min, 0, 0, tz).getTime());
}

/** The salon-local calendar date of an instant. */
export function localDate(instant: Date, tz: string): LocalDate {
  const t = new TZDate(instant.getTime(), tz);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

/** The salon-local wall-clock time ("HH:mm") of an instant. */
export function localTime(instant: Date, tz: string): string {
  const t = new TZDate(instant.getTime(), tz);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

/** Day of the week of a calendar date (0 = Sunday). */
export function weekday(date: LocalDate): Weekday {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

/** Calendar arithmetic on a "YYYY-MM-DD" date. */
export function addDays(date: LocalDate, n: number): LocalDate {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function addMinutes(instant: Date, min: number): Date {
  return new Date(instant.getTime() + min * 60_000);
}

/** Minutes since midnight for "HH:mm". */
export function toMinutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}
