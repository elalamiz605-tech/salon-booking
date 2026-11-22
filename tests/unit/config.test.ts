import { describe, expect, test } from "vitest";
import { defineConfig, type SalonConfig } from "@/config/schema";
import config from "@config";

const clone = (): SalonConfig => structuredClone(config);

describe("salon configuration", () => {
  test("demo config is valid", () => {
    expect(() => defineConfig(config)).not.toThrow();
    expect(config.services).toHaveLength(7);
    expect(config.barbers).toHaveLength(3);
    expect(config.timezone).toBe("Europe/Madrid");
  });

  test("rejects a barber offering an unknown service", () => {
    const c = clone();
    c.barbers[0].serviceIds = ["nope"];
    expect(() => defineConfig(c)).toThrow(/unknown service "nope"/);
  });

  test("rejects close before open", () => {
    const c = clone();
    c.openingHours[2] = { open: "20:00", close: "10:00" };
    expect(() => defineConfig(c)).toThrow(/close must be after open/);
  });

  test("rejects a missing translation", () => {
    const c = clone() as unknown as { services: { name: Record<string, string> }[] };
    c.services[0].name = { en: "X" };
    expect(() => defineConfig(c as unknown as SalonConfig)).toThrow();
  });
});
