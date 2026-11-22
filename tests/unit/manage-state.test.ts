import { expect, test } from "vitest";
import config from "@config";
import type { BookingRow } from "@/db/schema";
import { manageViewState } from "@/lib/manage-state";

const NOW = new Date("2026-11-24T08:00:00Z");
const b = (over: Partial<BookingRow> = {}): BookingRow => ({
  id: "b", token: "t", barberId: "alvaro", serviceId: "scissor-cut", serviceName: "Scissor cut", durationMin: 45, priceCents: 3200,
  startsAt: new Date(NOW.getTime() + 3 * 3600_000), endsAt: new Date(NOW.getTime() + 3 * 3600_000 + 45 * 60_000),
  occupiedUntil: new Date(NOW.getTime() + 3 * 3600_000 + 50 * 60_000), customerName: "C", customerEmail: "c@example.com",
  customerPhone: null, notes: null, locale: "en", status: "confirmed", source: "online", createdAt: NOW, cancelledAt: null, anonymizedAt: null, ...over,
});

test("unknown", () => expect(manageViewState(null, NOW, config)).toBe("unknown"));
test("cancelled", () => expect(manageViewState(b({ status: "cancelled" }), NOW, config)).toBe("cancelled"));
test("too late", () => expect(manageViewState(b({ startsAt: new Date(NOW.getTime() + 60 * 60_000) }), NOW, config)).toBe("tooLate"));
test("confirmed", () => expect(manageViewState(b(), NOW, config)).toBe("confirmed"));
test("anonymized", () => expect(manageViewState(b({ anonymizedAt: NOW }), NOW, config)).toBe("anonymized"));
test("past appointment cannot be cancelled", () => expect(manageViewState(b({ startsAt: new Date(NOW.getTime() - 3600_000) }), NOW, config)).toBe("tooLate"));
