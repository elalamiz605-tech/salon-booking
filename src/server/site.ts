import { headers } from "next/headers";
import config from "@config";
import { getDb } from "@/db/client";
import type { Db } from "@/db/client";
import { isDemo, maybeResetDemo } from "@/server/demo";

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

/** Absolute base URL for links in emails. */
export async function baseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
