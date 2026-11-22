import type { DayHours, SalonConfig } from "@/config/schema";
import { addDays, addMinutes, localDate, toMinutes, weekday, zonedInstant, type LocalDate } from "@/lib/time";

/** A period during which a barber (or, with barberId null, the whole salon) is unavailable. `end` already includes any buffer. */
export type Busy = { barberId: string | null; start: Date; end: Date };
export type Slot = { start: Date; barberIds: string[] };

export type SlotQuery = {
  config: SalonConfig;
  date: LocalDate;
  serviceId: string;
  barberId: string | "any";
  busy: Busy[];
  now: Date;
  /** Admin bookings ignore minimum notice and the booking window. */
  ignoreLimits?: boolean;
};

/** Every date a customer may book: today through today + bookingWindowDays, closed days removed. */
export function bookableDates(config: SalonConfig, now: Date): LocalDate[] {
  const today = localDate(now, config.timezone);
  const dates: LocalDate[] = [];
  for (let i = 0; i <= config.bookingWindowDays; i++) {
    const d = addDays(today, i);
    if (config.openingHours[weekday(d)]) dates.push(d);
  }
  return dates;
}

/** The hours a barber works on a date: salon hours intersected with the barber's own hours. */
function workingWindow(config: SalonConfig, barberId: string, date: LocalDate): { open: number; close: number } | null {
  const day = weekday(date);
  const salon = config.openingHours[day];
  const barber = config.barbers.find((b) => b.id === barberId);
  if (!salon || !barber || barber.daysOff.includes(day)) return null;
  const own: DayHours | undefined = barber.hours?.[day];
  if (own === null) return null;
  const open = Math.max(toMinutes(salon.open), own ? toMinutes(own.open) : 0);
  const close = Math.min(toMinutes(salon.close), own ? toMinutes(own.close) : 24 * 60);
  return close > open ? { open, close } : null;
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function getAvailableSlots(q: SlotQuery): Slot[] {
  const { config, date } = q;
  const service = config.services.find((s) => s.id === q.serviceId);
  if (!service) return [];
  if (!q.ignoreLimits && !bookableDates(config, q.now).includes(date)) return [];

  const earliest = q.ignoreLimits ? null : addMinutes(q.now, config.minNoticeMin);
  const barbers = config.barbers.filter(
    (b) => b.serviceIds.includes(service.id) && (q.barberId === "any" || b.id === q.barberId),
  );

  const byStart = new Map<number, Slot>();
  for (const barber of barbers) {
    const window = workingWindow(config, barber.id, date);
    if (!window) continue;
    const busy = q.busy.filter((b) => b.barberId === null || b.barberId === barber.id);
    for (let m = window.open; m + service.durationMin <= window.close; m += config.slotStepMin) {
      const start = zonedInstant(date, hhmm(m), config.timezone);
      if (earliest && start < earliest) continue;
      const occupiedUntil = addMinutes(start, service.durationMin + service.bufferMin);
      if (busy.some((b) => start < b.end && occupiedUntil > b.start)) continue;
      const key = start.getTime();
      const slot = byStart.get(key) ?? { start, barberIds: [] };
      slot.barberIds.push(barber.id);
      byStart.set(key, slot);
    }
  }
  return [...byStart.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** True when `start` is one of the slots offered to this barber. */
export function isSlotAvailable(q: SlotQuery & { start: Date; barberId: string }): boolean {
  return getAvailableSlots(q).some((s) => s.start.getTime() === q.start.getTime() && s.barberIds.includes(q.barberId));
}

/** For "any barber": the candidate with the fewest bookings that day; ties go to config order. */
export function pickBarber(candidates: string[], bookingsToday: Record<string, number>, config: SalonConfig): string {
  const order = (id: string) => config.barbers.findIndex((b) => b.id === id);
  return [...candidates].sort((a, b) => (bookingsToday[a] ?? 0) - (bookingsToday[b] ?? 0) || order(a) - order(b))[0];
}
