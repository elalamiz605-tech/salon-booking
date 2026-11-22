import { beforeEach, describe, expect, test, vi } from "vitest";
import bcrypt from "bcryptjs";
import { createSession, readSession, verifyPassword } from "@/server/auth";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("SESSION_SECRET", "unit-test-secret-at-least-32-characters");
  vi.stubEnv("ADMIN_EMAIL", "owner@example.com");
  vi.stubEnv("ADMIN_PASSWORD_HASH", bcrypt.hashSync("correct horse", 4));
  vi.stubEnv("DEMO_MODE", "false");
});

describe("admin session", () => {
  test("round trip", async () => {
    const token = await createSession();
    expect(await readSession(token)).toEqual({ sub: "admin" });
  });
  test("expired token is rejected", async () => {
    const token = await createSession(new Date("2026-01-01T00:00:00Z"));
    expect(await readSession(token, new Date("2026-01-01T13:00:00Z"))).toBeNull();
  });
  test("tampered token is rejected", async () => {
    const token = await createSession();
    expect(await readSession(token.slice(0, -2) + "xx")).toBeNull();
    expect(await readSession(undefined)).toBeNull();
  });
});

describe("password check", () => {
  test("accepts the right email and password only", async () => {
    expect(await verifyPassword("owner@example.com", "correct horse")).toBe(true);
    expect(await verifyPassword("OWNER@example.com ", "correct horse")).toBe(true);
    expect(await verifyPassword("owner@example.com", "wrong")).toBe(false);
    expect(await verifyPassword("other@example.com", "correct horse")).toBe(false);
  });
  test("demo credentials work only in demo mode", async () => {
    expect(await verifyPassword("demo@rizostudio.example", "rizo-demo")).toBe(false);
    vi.stubEnv("DEMO_MODE", "true");
    expect(await verifyPassword("demo@rizostudio.example", "rizo-demo")).toBe(true);
  });
});
