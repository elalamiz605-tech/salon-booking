"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/config/schema";

/** EN | ES links that keep the current page and swap the language segment. */
export function LanguageSwitch({ locales, current, label }: { locales: Locale[]; current: Locale; label: string }) {
  const path = usePathname() ?? `/${current}`;
  const rest = path.split("/").slice(2).join("/");
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2.5">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-2.5">
          {i > 0 && <span aria-hidden className="h-3 w-px bg-[var(--line)]" />}
          <Link
            href={`/${l}${rest ? `/${rest}` : ""}`}
            aria-current={l === current ? "true" : undefined}
            className={`py-1 text-[.72rem] uppercase tracking-[.22em] transition-colors ${l === current ? "text-accent" : "text-ivory-dim hover:text-ivory"}`}
          >
            {l.toUpperCase()}
          </Link>
        </span>
      ))}
    </div>
  );
}
