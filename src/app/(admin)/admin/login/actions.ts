"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { createSession, SESSION_COOKIE, verifyPassword } from "@/server/auth";
import { hitRateLimit } from "@/server/rate-limit";
import { clientIp } from "@/server/site";

export type LoginState = { error: string | null; email: string };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const rl = await hitRateLimit(await getDb(), `login:${await clientIp()}`, 10, 15, new Date());
  if (!rl.allowed) return { error: "Too many attempts. Try again in a few minutes.", email };
  if (!(await verifyPassword(email, password))) return { error: "Wrong email or password", email };
  (await cookies()).set(SESSION_COOKIE, await createSession(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/admin", maxAge: 12 * 3600,
  });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/admin" });
  redirect("/admin/login");
}
