import type { Metadata } from "next";
import config from "@config";
import { NewBookingForm } from "@/components/admin/forms";
import { formatPrice } from "@/lib/format";
import { parseDate } from "@/server/admin-data";
import { newBookingAction } from "../actions";

export const metadata: Metadata = { title: "New booking" };

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const date = parseDate((await searchParams).date);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl">New booking</h1>
        <p className="text-sm text-ivory-dim">For phone calls and walk-ins. Minimum notice and the booking window don&apos;t apply; double bookings are still impossible.</p>
      </div>
      <NewBookingForm
        action={newBookingAction}
        date={date}
        services={config.services.map((s) => ({ value: s.id, label: `${s.name.en} · ${s.durationMin} min · ${formatPrice(s.priceCents, "en")}` }))}
        barbers={config.barbers.map((b) => ({ value: b.id, label: b.name }))}
      />
    </div>
  );
}
