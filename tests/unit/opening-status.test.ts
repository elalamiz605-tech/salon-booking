import { expect, test } from "vitest";
import config from "@config";
import { openingStatus } from "@/lib/opening-status";
import { zonedInstant } from "@/lib/time";

const at = (date: string, hhmm: string) => zonedInstant(date, hhmm, config.timezone);

test("open on Tuesday at noon", () => {
  expect(openingStatus(at("2026-11-24", "12:00"), config)).toEqual({ open: true, key: "openUntil", time: "20:00" });
});
test("before opening on Tuesday", () => {
  expect(openingStatus(at("2026-11-24", "09:00"), config)).toEqual({ open: false, key: "opensToday", time: "10:00" });
});
test("Saturday evening points to Tuesday", () => {
  expect(openingStatus(at("2026-11-28", "21:00"), config)).toEqual({ open: false, key: "opensOn", time: "10:00", weekday: 2 });
});
test("Wednesday evening opens tomorrow", () => {
  expect(openingStatus(at("2026-11-25", "20:30"), config)).toEqual({ open: false, key: "opensTomorrow", time: "10:00" });
});
test("closing time itself counts as closed", () => {
  expect(openingStatus(at("2026-11-24", "20:00"), config).open).toBe(false);
});

import { hoursSummary, hoursTable } from "@/lib/hours";

test("hours summary groups consecutive days", () => {
  expect(hoursSummary(config, "en")).toBe("Tue – Sat · 10:00–20:00");
  expect(hoursSummary(config, "es")).toBe("Mar – Sáb · 10:00–20:00");
});

test("hours table lists the week from Monday", () => {
  const rows = hoursTable(config, "en");
  expect(rows[0]).toEqual({ day: "Monday", hours: null });
  expect(rows[1]).toEqual({ day: "Tuesday", hours: "10:00–20:00" });
  expect(rows).toHaveLength(7);
});
