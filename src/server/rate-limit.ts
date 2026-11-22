import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { rateLimits } from "@/db/schema";

/** Fixed-window limiter stored in the database, so it works across serverless instances. */
export async function hitRateLimit(db: Db, key: string, limit: number, windowMin: number, now: Date): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const windowMs = windowMin * 60_000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const [row] = await db.insert(rateLimits).values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });
  const retryAfterSec = Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000);
  return { allowed: row.count <= limit, retryAfterSec };
}
