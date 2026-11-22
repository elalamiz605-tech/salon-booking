import Link from "next/link";
import config from "@config";
import type { Locale } from "@/config/schema";
import { getDict } from "@/i18n";
import { LanguageSwitch } from "./LanguageSwitch";

/** Site header: brand, section links (home only), language switch and Book button. */
export function Header({ locale, sectionLinks = true }: { locale: Locale; sectionLinks?: boolean }) {
  const t = getDict(locale);
  const [first, ...rest] = config.name.split(" ");
  return (
    <header className="gutter relative z-10 flex items-center justify-between gap-6 py-6">
      <Link href={`/${locale}`} className="flex flex-col items-start gap-0.5 leading-none text-ivory no-underline">
        <span className="font-display text-[2rem] font-medium italic">{first}</span>
        {rest.length > 0 && <span className="pl-0.5 text-[.6rem] uppercase tracking-[.42em] text-accent">{rest.join(" ")}</span>}
      </Link>
      {sectionLinks && (
        <nav aria-label="Main" className="hidden gap-10 lg:flex">
          {(["services", "barbers", "visit"] as const).map((k) => (
            <a key={k} href={`/${locale}#${k}`} className="text-[.72rem] uppercase tracking-[.22em] text-ivory-dim no-underline transition-colors hover:text-ivory">
              {t.nav[k]}
            </a>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-5">
        <LanguageSwitch locales={config.locales} current={locale} label={t.nav.language} />
        <Link href={`/${locale}/book`} className="btn btn-sm max-sm:hidden">{t.nav.book}</Link>
      </div>
    </header>
  );
}
