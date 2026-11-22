import { headers } from "next/headers";
import config from "@config";
import { getDb } from "@/db/client";
import type { Db } from "@/db/client";
import { isDemo, maybeResetDemo } from "@/server/demo";
import { resolveBaseUrl } from "@/lib/base-url";

/** The shared database, after an hourly demo reset when the site runs in demo mode. */
export async function siteDb(): Promise<Db> {
  const db = await getDb();
  if (isDemo()) await maybeResetDemo(db, config, new Date());
  return db;
}

/** The visitor's IP (first hop of x-forwarded-for), used only for rate limiting. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Absolute base URL for links in emails (see resolveBaseUrl: production never trusts request headers). */
export async function baseUrl(): Promise<string> {
  const h = await headers();
  return resolveBaseUrl({
    appUrl: process.env.APP_URL,
    production: process.env.NODE_ENV === "production",
    vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    host: h.get("host"),
    forwardedHost: h.get("x-forwarded-host"),
  });
}
