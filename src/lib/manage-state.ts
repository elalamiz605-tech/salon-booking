import type { SalonConfig } from "@/config/schema";
import type { BookingRow } from "@/db/schema";

export type ManageState = "confirmed" | "cancelled" | "tooLate" | "anonymized" | "unknown";

/** What the customer's manage page should show for a booking. */
export function manageViewState(booking: BookingRow | null, now: Date, config: SalonConfig): ManageState {
  if (!booking) return "unknown";
  if (booking.anonymizedAt) return "anonymized";
  if (booking.status === "cancelled") return "cancelled";
  if (booking.startsAt.getTime() - now.getTime() < config.cancelCutoffMin * 60_000) return "tooLate";
  return "confirmed";
}
