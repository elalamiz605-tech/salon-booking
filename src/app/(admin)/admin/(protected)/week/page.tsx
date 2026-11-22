import type { Metadata } from "next";
import Link from "next/link";
import config from "@config";
import { siteDb as getDb } from "@/server/site";
import { formatDateLong } from "@/lib/format";
import { addDays, localDate, weekday, zonedInstant } from "@/lib/time";
import { parseDate } from "@/server/admin-data";
import { listBookings } from "@/server/bookings";

export const metadata: Metadata = { title: "Week" };

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const date = parseDate((await searchParams).date);
  const monday = addDays(date, -((weekday(date) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const rows = await listBookings(await getDb(), {
    from: zonedInstant(monday, "00:00", config.timezone), to: zonedInstant(addDays(monday, 7), "00:00", config.timezone),
  });
  const active = rows.filter((r) => r.status !== "cancelled");
  const count = (barberId: string, day: string) => active.filter((r) => r.barberId === barberId && localDate(r.startsAt, config.timezone) === day).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl">Week of {formatDateLong(monday, "en")}</h1>
        <nav className="flex gap-4 text-sm">
          <Link href={`/admin/week?date=${addDays(monday, -7)}`} className="link-underline">Previous week</Link>
          <Link href={`/admin/week?date=${addDays(monday, 7)}`} className="link-underline">Next week</Link>
        </nav>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="py-2 text-left font-normal text-ivory-dim">Barber</th>
              {days.map((d) => (
                <th key={d} className="py-2 text-center font-normal">
                  <Link href={`/admin?date=${d}`} className={`no-underline hover:text-accent ${config.openingHours[weekday(d)] ? "" : "text-ivory-dim"}`}>{formatDateLong(d, "en").replace(/ \w+$/, "")}</Link>
                </th>
              ))}
              <th className="py-2 text-right font-normal text-ivory-dim">Total</th>
            </tr>
          </thead>
          <tbody>
            {config.barbers.map((b) => (
              <tr key={b.id} className="border-t border-[var(--line-soft)]">
                <td className="py-3 font-display text-lg">{b.name}</td>
                {days.map((d) => <td key={d} className="py-3 text-center tabular-nums">{count(b.id, d) || <span className="text-ivory-dim">·</span>}</td>)}
                <td className="py-3 text-right tabular-nums">{days.reduce((n, d) => n + count(b.id, d), 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
