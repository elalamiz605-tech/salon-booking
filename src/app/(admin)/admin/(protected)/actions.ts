"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import config from "@config";
import { siteDb as getDb } from "@/server/site";
import { localTime, zonedInstant } from "@/lib/time";
import { requireAdmin } from "@/server/admin-session";
import {
  anonymizeBooking, BlockConflictError, cancelBooking, createBlock, createBooking, deleteBlock, markNoShow, moveBooking,
  SlotTakenError, ValidationError,
} from "@/server/bookings";

export type FormState = { error: string | null; conflicts?: string[] };

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const FIELD_ERRORS: Record<string, string> = {
  name: "Enter the customer's name (2–80 characters).",
  email: "That email address doesn't look right.",
  phone: "Phone number is too long.",
  notes: "Notes must be under 500 characters.",
  serviceId: "Choose a service.",
  barberId: "Choose a barber.",
};

export async function newBookingAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const date = s(form, "date"), time = s(form, "time");
  if (!validDate(date) || !validTime(time)) return { error: "Enter a date and a time (HH:mm)." };
  let id: string;
  try {
    const b = await createBooking(await getDb(), {
      serviceId: s(form, "serviceId"), barberId: s(form, "barberId") || "any", start: zonedInstant(date, time, config.timezone),
      name: s(form, "name"), email: s(form, "email"), phone: s(form, "phone"), notes: s(form, "notes"), locale: config.defaultLocale,
    }, { now: new Date(), source: "admin" });
    id = b.id;
  } catch (e) {
    if (e instanceof SlotTakenError) return { error: "That time is taken or outside working hours." };
    if (e instanceof ValidationError) return { error: FIELD_ERRORS[e.field] ?? `Check ${e.field}.` };
    throw e;
  }
  revalidatePath("/admin");
  redirect(`/admin/bookings/${id}`);
}

export async function moveAction(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const date = s(form, "date"), time = s(form, "time"), barberId = s(form, "barberId");
  if (!validDate(date) || !validTime(time)) return { error: "Enter a date and a time (HH:mm)." };
  try {
    await moveBooking(await getDb(), id, { start: zonedInstant(date, time, config.timezone), barberId }, new Date());
  } catch (e) {
    if (e instanceof SlotTakenError) return { error: "That time is taken or outside working hours." };
    throw e;
  }
  revalidatePath(`/admin/bookings/${id}`);
  return { error: null };
}

export async function addBlockAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const date = s(form, "date"), from = s(form, "from"), to = s(form, "to");
  if (!validDate(date) || !validTime(from) || !validTime(to) || to <= from) return { error: "Enter a date and a time range where “To” is after “From”." };
  try {
    await createBlock(await getDb(), {
      barberId: s(form, "barberId") || null, start: zonedInstant(date, from, config.timezone), end: zonedInstant(date, to, config.timezone), reason: s(form, "reason") || null,
    });
  } catch (e) {
    if (e instanceof BlockConflictError) {
      return {
        error: "These bookings are in that period:",
        conflicts: e.bookings.map((b) => `${localTime(b.startsAt, config.timezone)} · ${b.customerName ?? "—"} · ${config.barbers.find((x) => x.id === b.barberId)?.name ?? b.barberId}`),
      };
    }
    throw e;
  }
  revalidatePath("/admin/blocks");
  return { error: null };
}

export async function deleteBlockAction(form: FormData) {
  await requireAdmin();
  await deleteBlock(await getDb(), s(form, "id"));
  revalidatePath("/admin/blocks");
}

export async function cancelAdminAction(form: FormData) {
  await requireAdmin();
  await cancelBooking(await getDb(), s(form, "id"));
  revalidatePath(`/admin/bookings/${s(form, "id")}`);
}

export async function noShowAction(form: FormData) {
  await requireAdmin();
  await markNoShow(await getDb(), s(form, "id"));
  revalidatePath(`/admin/bookings/${s(form, "id")}`);
}

export async function anonymizeAction(form: FormData) {
  await requireAdmin();
  await anonymizeBooking(await getDb(), s(form, "id"), new Date());
  revalidatePath(`/admin/bookings/${s(form, "id")}`);
}
