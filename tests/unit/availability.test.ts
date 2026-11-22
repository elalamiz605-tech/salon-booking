import { describe, expect, test } from "vitest";
import config from "@config";
import { bookableDates, getAvailableSlots, isSlotAvailable, pickBarber, type Busy } from "@/lib/availability";
import { localTime, zonedInstant } from "@/lib/time";

const tz = config.timezone;
const NOW = new Date("2026-11-23T08:00:00Z"); // Monday 09:00 in Madrid
const at = (date: string, hhmm: string) => zonedInstant(date, hhmm, tz);
const times = (slots: { start: Date }[]) => slots.map((s) => localTime(s.start, tz));

function slots(over: Partial<Parameters<typeof getAvailableSlots>[0]> = {}) {
  return getAvailableSlots({ config, date: "2026-11-24", serviceId: "scissor-cut", barberId: "alvaro", busy: [], now: NOW, ...over });
}

describe("getAvailableSlots", () => {
  test("closed on Monday", () => {
    expect(slots({ date: "2026-11-23" })).toEqual([]);
  });

  test("scissor cut on an empty Tuesday with alvaro", () => {
    const t = times(slots());
    expect(t[0]).toBe("10:00");
    expect(t.at(-1)).toBe("19:15");
    expect(t).toHaveLength(38);
  });

  test("respects barber hours", () => {
    expect(times(slots({ barberId: "iker" }))[0]).toBe("12:00");
  });

  test("respects day off", () => {
    expect(slots({ barberId: "marco", date: "2026-11-25" })).toEqual([]);
  });

  test("existing booking blocks overlap plus buffer", () => {
    const busy: Busy[] = [{ barberId: "alvaro", start: at("2026-11-24", "11:00"), end: at("2026-11-24", "11:50") }];
    const t = times(slots({ busy }));
    for (const blocked of ["10:15", "10:30", "11:00", "11:45"]) expect(t).not.toContain(blocked);
    expect(t).toContain("10:00");
    expect(t).toContain("12:00");
  });

  test("buffer boundary is exact", () => {
    const busy: Busy[] = [{ barberId: "alvaro", start: at("2026-11-24", "11:00"), end: at("2026-11-24", "11:50") }];
    const fiveStep = { ...config, slotStepMin: 5 };
    const t = times(getAvailableSlots({ config: fiveStep, date: "2026-11-24", serviceId: "scissor-cut", barberId: "alvaro", busy, now: NOW }));
    expect(t).toContain("10:10");
    expect(t).not.toContain("10:15");
    expect(t).toContain("11:50");
  });

  test("salon-wide block applies to every barber", () => {
    const busy: Busy[] = [{ barberId: null, start: at("2026-11-24", "14:00"), end: at("2026-11-24", "16:00") }];
    const all = slots({ barberId: "any", busy });
    const inBlock = all.filter((s) => s.start < busy[0].end && new Date(s.start.getTime() + 50 * 60_000) > busy[0].start);
    expect(inBlock).toEqual([]);
    expect(times(all)).toContain("16:00");
  });

  test("minimum notice", () => {
    expect(times(slots({ now: new Date("2026-11-24T09:30:00Z") }))[0]).toBe("12:30");
  });

  test("no past slots late in the day", () => {
    expect(slots({ now: new Date("2026-11-24T18:30:00Z") })).toEqual([]);
  });

  test("booking window", () => {
    const dates = bookableDates(config, NOW);
    expect(dates[0]).toBe("2026-11-24");
    expect(dates.at(-1)! <= "2026-12-23").toBe(true);
    expect(dates).toContain("2026-12-23");
    expect(slots({ date: "2026-12-24" })).toEqual([]);
    expect(slots({ date: "2026-12-24", ignoreLimits: true }).length).toBeGreaterThan(0);
  });

  test("any barber merges candidates", () => {
    const noon = slots({ barberId: "any" }).find((s) => localTime(s.start, tz) === "12:00");
    expect(noon?.barberIds).toEqual(["alvaro", "marco", "iker"]);
  });

  test("barbers who don't offer the service are left out", () => {
    const shave = slots({ barberId: "any", serviceId: "hot-towel-shave" });
    expect(new Set(shave.flatMap((s) => s.barberIds))).toEqual(new Set(["alvaro"]));
  });

  test.each([
    ["2026-03-31", new Date("2026-03-01T08:00:00Z")],
    ["2026-10-27", new Date("2026-10-01T08:00:00Z")],
  ])("DST week %s keeps local times", (date, now) => {
    const t = times(slots({ date, now }));
    expect(t[0]).toBe("10:00");
    expect(t).toHaveLength(38);
  });
});

describe("isSlotAvailable", () => {
  test("true for an offered slot, false for an off-grid start", () => {
    const base = { config, date: "2026-11-24", serviceId: "scissor-cut", barberId: "alvaro", busy: [], now: NOW };
    expect(isSlotAvailable({ ...base, start: at("2026-11-24", "10:00") })).toBe(true);
    expect(isSlotAvailable({ ...base, start: at("2026-11-24", "10:07") })).toBe(false);
  });
});

describe("pickBarber", () => {
  test("fewest bookings wins, ties by config order", () => {
    expect(pickBarber(["alvaro", "iker"], { alvaro: 3, iker: 1 }, config)).toBe("iker");
    expect(pickBarber(["iker", "alvaro"], {}, config)).toBe("alvaro");
  });
});
