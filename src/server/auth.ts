import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import config from "@config";
import { isDemo } from "@/server/demo";

export const SESSION_COOKIE = "salon_admin";
const SESSION_HOURS = 12;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET ?? "";
  if (s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

const sameText = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The demo login shown on the demo site: demo@<salon email domain>. */
export function demoCredentials() {
  return { email: `demo@${config.email.split("@")[1]}`, password: process.env.DEMO_ADMIN_PASSWORD || "rizo-demo" };
}

export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (isDemo()) {
    const demo = demoCredentials();
    if (sameText(e, demo.email) && sameText(password, demo.password)) return true;
  }
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH ?? "";
  if (!adminEmail || !hash) return false;
  const passwordOk = await bcrypt.compare(password, hash);
  return sameText(e, adminEmail) && passwordOk;
}

export async function createSession(now = new Date()): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("admin")
    .setIssuedAt(iat).setExpirationTime(iat + SESSION_HOURS * 3600).sign(secret());
}

export async function readSession(token: string | undefined, now = new Date()): Promise<{ sub: "admin" } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], currentDate: now });
    return payload.sub === "admin" ? { sub: "admin" } : null;
  } catch {
    return null;
  }
}
