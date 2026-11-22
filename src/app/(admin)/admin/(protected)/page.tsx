import type { Metadata } from "next";
import Link from "next/link";
import config from "@config";
import { StatusChip } from "@/components/admin/StatusChip";
import { formatDateLong } from "@/lib/format";
import { addDays, localTime, toMinutes, weekday } from "@/lib/time";
import { dayData, parseDate, today } from "@/server/admin-data";

export const metadata: Metadata = { title: "Day" };
const PX = 1.6; // pixels per minute

export default async function DayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const date = parseDate((await searchParams).date);
  const { bookings, blocks, stale } = await dayData(date);
  const tz = config.timezone;
  const hours = config.openingHours[weekday(date)];
  const open = hours ? toMinutes(hours.open) : 9 * 60, close = hours ? toMinutes(hours.close) : 20 * 60;
  const mins = (d: Date) => toMinutes(localTime(d, tz));
  const active = bookings.filter((b) => b.status !== "cancelled");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const isToday = date === today();
  const hourMarks = Array.from({ length: Math.ceil((close - open) / 60) + 1 }, (_, i) => open + i * 60).filter((m) => m <= close);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{isToday ? formatDateLong(date, "en") : "Day"}</p>
          <h1 className="font-display text-4xl">{isToday ? "Today" : formatDateLong(date, "en")}</h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href={`/admin?date=${addDays(date, -1)}`} className="link-underline">Previous</Link>
          {!isToday && <Link href="/admin" className="link-underline">Today</Link>}
          <Link href={`/admin?date=${addDays(date, 1)}`} className="link-underline">Next</Link>
          <Link href={`/admin/new?date=${date}`} className="btn btn-sm">New booking</Link>
        </nav>
      </div>
      {!hours && <p className="text-ivory-dim">The salon is closed on this day.</p>}
      <p className="text-sm text-ivory-dim">{active.length} booking{active.length === 1 ? "" : "s"}</p>

      <div className="overflow-x-auto">
        <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `3.5rem repeat(${config.barbers.length}, minmax(0, 1fr))` }}>
          <div />
          {config.barbers.map((b) => <div key={b.id} className="border-b border-[var(--line-soft)] pb-2 font-display text-xl">{b.name}</div>)}
          <div className="relative" style={{ height: (close - open) * PX }}>
            {hourMarks.map((m) => (
              <span key={m} className="absolute -translate-y-1/2 text-xs tabular-nums text-ivory-dim" style={{ top: (m - open) * PX }}>
                {String(Math.floor(m / 60)).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {config.barbers.map((barber) => (
            <div key={barber.id} className="relative border-l border-[var(--line-soft)]" style={{ height: (close - open) * PX }}>
              {hourMarks.map((m) => <span key={m} className="absolute inset-x-0 border-t border-[var(--line-soft)] opacity-50" style={{ top: (m - open) * PX }} />)}
              {blocks.filter((k) => k.barberId === null || k.barberId === barber.id).map((k) => {
                const top = Math.max(0, mins(k.startsAt) - open), end = Math.min(close, mins(k.endsAt)) - open;
                return (
                  <div key={k.id} className="absolute inset-x-1 overflow-hidden border border-dashed border-[var(--line)] bg-[repeating-linear-gradient(135deg,transparent_0_6px,color-mix(in_srgb,var(--accent)_10%,transparent)_6px_12px)] p-1 text-xs text-ivory-dim" style={{ top: top * PX, height: Math.max(12, (end - top) * PX) }}>
                    {k.reason ?? "Time off"}
                  </div>
                );
              })}
              {active.filter((b) => b.barberId === barber.id).map((b) => (
                <Link key={b.id} href={`/admin/bookings/${b.id}`}
                  className={`absolute inset-x-1 flex flex-col gap-0.5 overflow-hidden border p-1.5 text-xs no-underline ${b.status === "no_show" ? "border-[#f0a3a3]" : "border-accent"} bg-[color-mix(in_srgb,var(--primary)_55%,var(--ink))] text-ivory hover:bg-primary`}
                  style={{ top: (mins(b.startsAt) - open) * PX, height: Math.max(22, b.durationMin * PX) }}>
                  <span className="tabular-nums">{localTime(b.startsAt, config.timezone)} · <strong className="font-semibold">{b.customerName ?? "Anonymised"}</strong></span>
                  <span className="text-ivory-dim">{config.services.find((s) => s.id === b.serviceId)?.name.en ?? b.serviceName}{b.status === "no_show" ? " · No-show" : ""}</span>
                  {stale.has(b.id) && <span className="text-[#f0a3a3]">Barber/service no longer offered</span>}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {active.some((b) => !config.barbers.some((x) => x.id === b.barberId)) && (
        <section className="flex flex-col gap-2">
          <h2 className="label">Bookings for barbers no longer in the team</h2>
          {active.filter((b) => !config.barbers.some((x) => x.id === b.barberId)).map((b) => (
            <Link key={b.id} href={`/admin/bookings/${b.id}`} className="text-sm underline">{localTime(b.startsAt, tz)} · {b.customerName} · {b.serviceName} (Barber/service no longer offered)</Link>
          ))}
        </section>
      )}

      {cancelled.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="label">Cancelled</h2>
          {cancelled.map((b) => (
            <Link key={b.id} href={`/admin/bookings/${b.id}`} className="flex items-center gap-3 text-sm text-ivory-dim no-underline hover:text-ivory">
              <span className="tabular-nums">{localTime(b.startsAt, tz)}</span> {b.customerName ?? "Anonymised"} · {b.serviceName} <StatusChip status="cancelled" />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
