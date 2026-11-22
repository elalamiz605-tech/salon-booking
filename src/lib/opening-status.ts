import type { SalonConfig, Weekday } from "@/config/schema";
import { addDays, localDate, localTime, toMinutes, weekday } from "@/lib/time";

export type OpeningStatus =
  | { open: true; key: "openUntil"; time: string }
  | { open: false; key: "opensToday" | "opensTomorrow"; time: string }
  | { open: false; key: "opensOn"; time: string; weekday: Weekday };

/** "Open now · until 20:00" style status, in the salon's time zone. */
export function openingStatus(now: Date, config: SalonConfig): OpeningStatus {
  const today = localDate(now, config.timezone);
  const mins = toMinutes(localTime(now, config.timezone));
  const hours = config.openingHours[weekday(today)];
  if (hours && mins >= toMinutes(hours.open) && mins < toMinutes(hours.close)) return { open: true, key: "openUntil", time: hours.close };
  if (hours && mins < toMinutes(hours.open)) return { open: false, key: "opensToday", time: hours.open };
  for (let d = 1; d <= 7; d++) {
    const day = addDays(today, d);
    const h = config.openingHours[weekday(day)];
    if (h) return d === 1 ? { open: false, key: "opensTomorrow", time: h.open } : { open: false, key: "opensOn", time: h.open, weekday: weekday(day) };
  }
  return { open: false, key: "opensToday", time: "" };
}
