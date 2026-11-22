import { expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { hitRateLimit } from "@/server/rate-limit";

test("allows the limit, blocks the next, resets in the next window", async () => {
  const db = await createTestDb();
  const now = new Date("2026-11-24T10:05:00Z");
  for (let i = 0; i < 5; i++) expect((await hitRateLimit(db, "book:1.2.3.4", 5, 60, now)).allowed).toBe(true);
  const sixth = await hitRateLimit(db, "book:1.2.3.4", 5, 60, now);
  expect(sixth.allowed).toBe(false);
  expect(sixth.retryAfterSec).toBe(55 * 60);
  expect((await hitRateLimit(db, "book:9.9.9.9", 5, 60, now)).allowed).toBe(true);
  expect((await hitRateLimit(db, "book:1.2.3.4", 5, 60, new Date("2026-11-24T11:00:00Z"))).allowed).toBe(true);
});
