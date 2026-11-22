import type { Locale, SalonConfig, Weekday } from "@/config/schema";

const SHORT: Record<Locale, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
};
const LONG: Record<Locale, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
};
const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0]; // Monday first, as in Spain

const span = (h: { open: string; close: string } | null) => (h ? `${h.open}–${h.close}` : null);

/** Compact opening hours, e.g. "Tue – Sat · 10:00–20:00"; groups separated by " / ". */
export function hoursSummary(config: SalonConfig, locale: Locale): string {
  const groups: { from: Weekday; to: Weekday; hours: string }[] = [];
  for (const d of WEEK) {
    const h = span(config.openingHours[d]);
    if (!h) continue;
    const last = groups.at(-1);
    if (last && last.hours === h && WEEK.indexOf(last.to) === WEEK.indexOf(d) - 1) last.to = d;
    else groups.push({ from: d, to: d, hours: h });
  }
  return groups
    .map((g) => `${SHORT[locale][g.from]}${g.to !== g.from ? ` – ${SHORT[locale][g.to]}` : ""} · ${g.hours}`)
    .join(" / ");
}

/** One row per day, Monday first; hours null when closed. */
export function hoursTable(config: SalonConfig, locale: Locale): { day: string; hours: string | null }[] {
  return WEEK.map((d) => ({ day: LONG[locale][d], hours: span(config.openingHours[d]) }));
}
