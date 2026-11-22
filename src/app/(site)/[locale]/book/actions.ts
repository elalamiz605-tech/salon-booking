"use server";

import config from "@config";
import type { Locale } from "@/config/schema";
import { createBooking, SlotTakenError, ValidationError } from "@/server/bookings";
import { sendConfirmation } from "@/server/email";
import { hitRateLimit } from "@/server/rate-limit";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { baseUrl, clientIp, siteDb } from "@/server/site";

export type SubmitResult =
  | { ok: true; token: string }
  | { ok: false; error: "slotTaken" | "rateLimited" | "validation" | "generic"; field?: string };

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};

export async function submitBooking(form: FormData): Promise<SubmitResult> {
  const locale = (config.locales as string[]).includes(str(form, "locale")) ? (str(form, "locale") as Locale) : config.defaultLocale;
  // Honeypot: real people never see or fill this field.
  if (str(form, HONEYPOT_FIELD)) return { ok: true, token: "thank-you" };
  if (str(form, "consent") !== "yes") return { ok: false, error: "validation", field: "consent" };
  const start = new Date(str(form, "start"));
  if (Number.isNaN(start.getTime())) return { ok: false, error: "slotTaken" };

  try {
    const db = await siteDb();
    const limit = Number(process.env.BOOKING_RATE_LIMIT) || config.rateLimitPerHour;
    const rl = await hitRateLimit(db, `book:${await clientIp()}`, limit, 60, new Date());
    if (!rl.allowed) return { ok: false, error: "rateLimited" };

    const booking = await createBooking(db, {
      serviceId: str(form, "serviceId"),
      barberId: str(form, "barberId") || "any",
      start,
      name: str(form, "name"),
      email: str(form, "email"),
      phone: str(form, "phone"),
      notes: str(form, "notes"),
      locale,
    }, { now: new Date(), source: "online" });

    // The booking is saved: an email problem must never turn it into an error for the customer.
    try {
      await sendConfirmation(booking, config, `${await baseUrl()}/${locale}/booking/${booking.token}`);
    } catch (e) {
      console.error("[email]", e);
    }
    return { ok: true, token: booking.token };
  } catch (e) {
    if (e instanceof SlotTakenError) return { ok: false, error: "slotTaken" };
    if (e instanceof ValidationError) return { ok: false, error: "validation", field: e.field };
    console.error("[booking]", e);
    return { ok: false, error: "generic" };
  }
}
