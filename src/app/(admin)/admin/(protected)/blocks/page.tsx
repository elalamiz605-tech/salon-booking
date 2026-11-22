import type { Metadata } from "next";
import config from "@config";
import { BlockForm } from "@/components/admin/forms";
import { siteDb as getDb } from "@/server/site";
import { formatDateLong } from "@/lib/format";
import { addDays, localDate, localTime } from "@/lib/time";
import { today } from "@/server/admin-data";
import { listBlocks } from "@/server/bookings";
import { addBlockAction, deleteBlockAction } from "../actions";

export const metadata: Metadata = { title: "Time off" };

export default async function BlocksPage() {
  const now = new Date();
  const blocks = await listBlocks(await getDb(), { from: now, to: new Date(now.getTime() + 366 * 86_400_000) });
  const tz = config.timezone;
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl">Time off</h1>
        <p className="text-sm text-ivory-dim">Holidays, a closed afternoon, a barber&apos;s appointment. Online booking stops offering these times. Weekly days off are set in the salon configuration.</p>
      </div>
      <BlockForm action={addBlockAction} date={addDays(today(), 1)} barbers={config.barbers.map((b) => ({ value: b.id, label: b.name }))} />
      <section className="flex flex-col">
        <h2 className="label mb-3">Upcoming</h2>
        {blocks.length === 0 && <p className="text-sm text-ivory-dim">No time off planned.</p>}
        {blocks.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line-soft)] py-3 text-sm">
            <span>
              <span className="tabular-nums">{formatDateLong(localDate(b.startsAt, tz), "en")} · {localTime(b.startsAt, tz)}–{localTime(b.endsAt, tz)}</span>
              {" · "}{b.barberId ? config.barbers.find((x) => x.id === b.barberId)?.name ?? b.barberId : "Whole salon"}
              {b.reason && <> · <span className="text-ivory-dim">{b.reason}</span></>}
            </span>
            <form action={deleteBlockAction}><input type="hidden" name="id" value={b.id} /><button type="submit" className="link-underline">Remove</button></form>
          </div>
        ))}
      </section>
    </div>
  );
}
