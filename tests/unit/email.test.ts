import { afterEach, describe, expect, test, vi } from "vitest";
import config from "@config";
import type { BookingRow } from "@/db/schema";
import { renderConfirmation, sendConfirmation } from "@/server/email";

const booking = (over: Partial<BookingRow> = {}): BookingRow => ({
  id: "b1", token: "tok", barberId: "alvaro", serviceId: "scissor-cut", serviceName: "Scissor cut", durationMin: 45, priceCents: 3200,
  startsAt: new Date("2026-11-24T09:00:00Z"), endsAt: new Date("2026-11-24T09:45:00Z"), occupiedUntil: new Date("2026-11-24T09:50:00Z"),
  customerName: "Carlos Ruiz", customerEmail: "carlos@example.com", customerPhone: null, notes: null, locale: "en",
  status: "confirmed", source: "online", createdAt: new Date(), cancelledAt: null, anonymizedAt: null, ...over,
});
const url = "https://rizo.example/en/booking/tok";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("renderConfirmation", () => {
  test("English", () => {
    const m = renderConfirmation(booking(), config, url);
    expect(m.subject).toBe("Your appointment at Rizo Studio is confirmed");
    expect(m.text).toContain("Tuesday 24 November, 10:00");
    expect(m.text).toContain("Álvaro");
    expect(m.text).toContain("€32");
    expect(m.text).toContain(url);
    expect(m.html).toContain(url);
  });

  test("Spanish", () => {
    const m = renderConfirmation(booking({ locale: "es" }), config, url);
    expect(m.subject).toBe("Tu cita en Rizo Studio está confirmada");
    expect(m.text).toContain("martes 24 de noviembre, 10:00");
    expect(m.text).toContain("Corte a tijera");
    expect(m.text).toContain("32 €");
  });

  test("escapes customer-controlled text in HTML", () => {
    const m = renderConfirmation(booking({ customerName: "<script>x</script>" }), config, url);
    expect(m.html).not.toContain("<script>x");
  });
});

describe("sendConfirmation", () => {
  test("logs when no API key is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("DEMO_MODE", "false");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await sendConfirmation(booking(), config, url)).toBe("logged");
    expect(log).toHaveBeenCalled();
  });

  test("skips in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect(await sendConfirmation(booking(), config, url)).toBe("skipped");
  });

  test("skips when the booking has no email", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    expect(await sendConfirmation(booking({ customerEmail: null }), config, url)).toBe("skipped");
  });
});
