import type { Locale } from "@/config/schema";

const INTL: Record<Locale, string> = { en: "en-GB", es: "es-ES" };
const plain = (s: string) => s.replace(/ | /g, " ");

/** "€32" / "32 €" (decimals only when needed). */
export function formatPrice(cents: number, locale: Locale): string {
  const whole = cents % 100 === 0;
  return plain(new Intl.NumberFormat(INTL[locale], {
    style: "currency", currency: "EUR", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2,
  }).format(cents / 100));
}

function parts(instant: Date, tz: string, locale: Locale) {
  const p = new Intl.DateTimeFormat(INTL[locale], {
    timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { weekday: get("weekday"), day: get("day"), month: get("month"), time: `${get("hour")}:${get("minute")}` };
}

/** "Tuesday 24 November, 10:00" / "martes 24 de noviembre, 10:00" in the salon's zone. */
export function formatDateTimeLong(instant: Date, tz: string, locale: Locale): string {
  const { weekday, day, month, time } = parts(instant, tz, locale);
  return locale === "es" ? `${weekday} ${day} de ${month}, ${time}` : `${weekday} ${day} ${month}, ${time}`;
}

/** "Tuesday 24 November" / "martes, 24 de noviembre" for a "YYYY-MM-DD" calendar date. */
export function formatDateLong(date: string, locale: Locale): string {
  const [y, m, d] = date.split("-").map(Number);
  const { weekday, day, month } = parts(new Date(Date.UTC(y, m - 1, d, 12)), "UTC", locale);
  return locale === "es" ? `${weekday}, ${day} de ${month}` : `${weekday} ${day} ${month}`;
}

/** "10:00" in the salon's zone. */
export function formatTime(instant: Date, tz: string): string {
  return parts(instant, tz, "en").time;
}
