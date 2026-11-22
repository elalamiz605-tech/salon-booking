import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import config from "@config";
import { StatusChip } from "@/components/admin/StatusChip";
import { ConfirmButton, MoveForm } from "@/components/admin/forms";
import { siteDb as getDb } from "@/server/site";
import { formatDateTimeLong, formatPrice } from "@/lib/format";
import { localDate, localTime } from "@/lib/time";
import { flagStaleBookings, getBookingById } from "@/server/bookings";
import { anonymizeAction, cancelAdminAction, moveAction, noShowAction } from "../../actions";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await getBookingById(await getDb(), id);
  if (!b) notFound();
  const tz = config.timezone;
  const barber = config.barbers.find((x) => x.id === b.barberId)?.name ?? b.barberId;
  const stale = flagStaleBookings([b], config).has(b.id);
  const rows: [string, React.ReactNode][] = [
    ["When", formatDateTimeLong(b.startsAt, tz, "en")],
    ["Service", `${b.serviceName} · ${b.durationMin} min · ${formatPrice(b.priceCents, "en")}`],
    ["Barber", barber],
    ["Phone", b.customerPhone ? <span className="select-all">{b.customerPhone}</span> : "—"],
    ["Email", b.customerEmail ? <span className="select-all">{b.customerEmail}</span> : "—"],
    ["Notes", b.notes ?? "—"],
    ["Booked", `${b.source === "admin" ? "By the salon" : "Online"} · ${formatDateTimeLong(b.createdAt, tz, "en")}`],
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link href={`/admin?date=${localDate(b.startsAt, tz)}`} className="link-underline self-start">Back to the day</Link>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-4xl">{b.customerName ?? "Anonymised customer"}</h1>
        <StatusChip status={b.status} />
      </div>
      {stale && <p className="text-sm text-[#f0a3a3]">Barber/service no longer offered — move or cancel this booking.</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-8">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="border-t border-[var(--line-soft)] py-3 text-sm text-ivory-dim">{k}</dt>
            <dd className="border-t border-[var(--line-soft)] py-3">{v}</dd>
          </div>
        ))}
      </dl>

      {b.status !== "cancelled" && (
        <section className="flex flex-col gap-4">
          <h2 className="label">Move</h2>
          <MoveForm action={moveAction.bind(null, b.id)} date={localDate(b.startsAt, tz)} time={localTime(b.startsAt, tz)} barberId={b.barberId}
            barbers={config.barbers.map((x) => ({ value: x.id, label: x.name }))} />
        </section>
      )}

      <section className="flex flex-wrap items-center gap-4">
        {b.status === "confirmed" && (
          <form action={noShowAction}><input type="hidden" name="id" value={b.id} /><button type="submit" className="btn btn-ghost btn-sm">Mark as no-show</button></form>
        )}
        {b.status !== "cancelled" && (
          <ConfirmButton action={cancelAdminAction} id={b.id} label="Cancel booking" confirmLabel="Yes, cancel" question="Cancel this booking? The time becomes free online." />
        )}
        {!b.anonymizedAt && (
          <ConfirmButton action={anonymizeAction} id={b.id} label="Delete customer data" confirmLabel="Delete data" question="Remove name, email, phone and notes for good?" />
        )}
      </section>
    </div>
  );
}
