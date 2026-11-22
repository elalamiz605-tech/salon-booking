import config from "@config";
import { getBookingByToken } from "@/server/bookings";
import { siteDb } from "@/server/site";

export const dynamic = "force-dynamic";

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** An .ics file so the customer can add the appointment to their calendar. */
export async function GET(_req: Request, { params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  const b = await getBookingByToken(await siteDb(), token);
  if (!b || b.status === "cancelled") return new Response("Not found", { status: 404 });
  const barber = config.barbers.find((x) => x.id === b.barberId)?.name ?? b.barberId;
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//salon-booking//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@salon-booking`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(b.startsAt)}`,
    `DTEND:${icsDate(b.endsAt)}`,
    `SUMMARY:${esc(`${b.serviceName} · ${config.name}`)}`,
    `DESCRIPTION:${esc(`${b.serviceName} with ${barber}. ${config.phone}`)}`,
    `LOCATION:${esc(config.address)}`,
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="appointment.ics"` },
  });
}
