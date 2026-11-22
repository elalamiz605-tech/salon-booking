import { describe, expect, test } from "vitest";
import { en, es, fill, formatDateLong, formatPrice, getDict } from "@/i18n";

function leaves(o: unknown, path = ""): [string, unknown][] {
  if (typeof o === "string") return [[path, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  return Object.entries(o as object).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

describe("dictionaries", () => {
  test("Spanish has every English key, all non-empty", () => {
    const esMap = new Map(leaves(es));
    for (const [key] of leaves(en)) {
      expect(esMap.has(key), key).toBe(true);
      expect(String(esMap.get(key)).trim().length, key).toBeGreaterThan(0);
    }
  });
  test("getDict returns the right language", () => {
    expect(getDict("es").hero.cta).toBe("Reserva tu sillón");
  });
  test("fill replaces placeholders", () => {
    expect(fill("Open now · until {time}", { time: "20:00" })).toBe("Open now · until 20:00");
  });
});

describe("formatting", () => {
  test("prices", () => {
    expect(formatPrice(3200, "es")).toBe("32 €");
    expect(formatPrice(3200, "en")).toBe("€32");
    expect(formatPrice(1850, "en")).toBe("€18.50");
  });
  test("long dates", () => {
    expect(formatDateLong("2026-11-24", "es")).toBe("martes, 24 de noviembre");
    expect(formatDateLong("2026-11-24", "en")).toBe("Tuesday 24 November");
  });
});
