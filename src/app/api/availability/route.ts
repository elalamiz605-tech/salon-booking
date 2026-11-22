import config from "@config";
import { getAvailableSlots } from "@/lib/availability";
import { localTime } from "@/lib/time";
import { busyForDate } from "@/server/bookings";
import { siteDb } from "@/server/site";

export const dynamic = "force-dynamic";

/** GET /api/availability?date=YYYY-MM-DD&service=ID&barber=ID|any */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const date = q.get("date") ?? "", serviceId = q.get("service") ?? "", barberId = q.get("barber") ?? "";
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const validService = config.services.some((s) => s.id === serviceId);
  const validBarber = barberId === "any" || config.barbers.some((b) => b.id === barberId);
  if (!validDate || !validService || !validBarber) return Response.json({ error: "Invalid parameters" }, { status: 400 });

  const db = await siteDb();
  const busy = await busyForDate(db, date, config);
  const slots = getAvailableSlots({ config, date, serviceId, barberId, busy, now: new Date() });
  return Response.json(
    { slots: slots.map((s) => ({ start: s.start.toISOString(), time: localTime(s.start, config.timezone) })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
