import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, SESSION_COOKIE } from "@/server/auth";

/** Used by every protected admin page: redirects to the login page without a valid session. */
export async function requireAdmin(): Promise<void> {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");
}
