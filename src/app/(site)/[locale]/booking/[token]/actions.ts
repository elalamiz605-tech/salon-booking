"use server";

import { revalidatePath } from "next/cache";
import { cancelBookingByToken, CancelTooLateError, NotFoundError } from "@/server/bookings";
import { siteDb } from "@/server/site";

export async function cancelAction(token: string, locale: string): Promise<{ ok: boolean; error?: "tooLate" | "notFound" }> {
  try {
    await cancelBookingByToken(await siteDb(), token, new Date());
    revalidatePath(`/${locale}/booking/${token}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof CancelTooLateError) return { ok: false, error: "tooLate" };
    if (e instanceof NotFoundError) return { ok: false, error: "notFound" };
    throw e;
  }
}
