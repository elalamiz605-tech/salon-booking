import Link from "next/link";
import type { ReactNode } from "react";
import config from "@config";
import { requireAdmin } from "@/server/admin-session";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const link = "text-[.72rem] uppercase tracking-[.2em] text-ivory-dim no-underline hover:text-ivory";
  return (
    <div className="min-h-svh">
      <header className="gutter flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line-soft)] py-4">
        <Link href="/admin" className="font-display text-2xl italic text-ivory no-underline">{config.name}</Link>
        <nav className="flex flex-wrap items-center gap-6">
          <Link href="/admin" className={link}>Day</Link>
          <Link href="/admin/week" className={link}>Week</Link>
          <Link href="/admin/new" className={link}>New booking</Link>
          <Link href="/admin/blocks" className={link}>Time off</Link>
          <form action={logoutAction}><button type="submit" className={`${link} cursor-pointer`}>Sign out</button></form>
        </nav>
      </header>
      <main className="gutter py-8">{children}</main>
    </div>
  );
}
