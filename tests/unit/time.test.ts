import { describe, expect, test } from "vitest";
import { addDays, addMinutes, localDate, localTime, weekday, zonedInstant } from "@/lib/time";

const tz = "Europe/Madrid";

describe("time helpers", () => {
  test("winter is UTC+1", () => {
    expect(zonedInstant("2026-11-24", "10:00", tz).toISOString()).toBe("2026-11-24T09:00:00.000Z");
  });
  test("summer is UTC+2", () => {
    expect(zonedInstant("2026-07-14", "10:00", tz).toISOString()).toBe("2026-07-14T08:00:00.000Z");
  });
  test("DST start and end days", () => {
    expect(zonedInstant("2026-03-29", "10:00", tz).toISOString()).toBe("2026-03-29T08:00:00.000Z");
    expect(zonedInstant("2026-10-25", "10:00", tz).toISOString()).toBe("2026-10-25T09:00:00.000Z");
  });
  test("local date and time of an instant", () => {
    const i = new Date("2026-11-24T23:30:00Z");
    expect(localDate(i, tz)).toBe("2026-11-25");
    expect(localTime(i, tz)).toBe("00:30");
  });
  test("weekday and calendar arithmetic", () => {
    expect(weekday("2026-11-24")).toBe(2);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMinutes(new Date("2026-11-24T09:00:00Z"), 45).toISOString()).toBe("2026-11-24T09:45:00.000Z");
  });
});
