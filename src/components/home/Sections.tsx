import Link from "next/link";
import config from "@config";
import type { Locale } from "@/config/schema";
import { fill, formatPrice, getDict } from "@/i18n";
import { hoursTable } from "@/lib/hours";
import { directionsUrl, mapEmbedUrl } from "@/lib/maps";

const SectionTitle = ({ label, title, intro }: { label: string; title: string; intro?: string }) => (
  <div className="mb-10 flex max-w-2xl flex-col gap-4">
    <p className="label flex items-center gap-3.5 before:h-px before:w-10 before:bg-accent before:content-['']">{label}</p>
    <h2 className="font-display text-[clamp(2.4rem,5vw,4rem)] leading-none">{title}</h2>
    {intro && <p className="text-ivory-dim">{intro}</p>}
  </div>
);

export function ServicesSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <section id="services" className="gutter scroll-mt-8 py-24">
      <SectionTitle label={config.name} title={t.home.servicesTitle} intro={t.home.servicesIntro} />
      <ul className="grid gap-x-16 md:grid-cols-2">
        {config.services.map((s) => (
          <li key={s.id} className="flex items-baseline gap-4 border-t border-[var(--line-soft)] py-5">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-2xl">{s.name[locale]}</h3>
              <p className="mt-1 text-sm text-ivory-dim">{s.description[locale]}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-2xl tabular-nums">{formatPrice(s.priceCents, locale)}</p>
              <p className="text-xs text-ivory-dim">{fill(t.book.duration, { n: s.durationMin })}</p>
            </div>
          </li>
        ))}
      </ul>
      <Link href={`/${locale}/book`} className="btn mt-12">{t.hero.cta}<span className="arr" aria-hidden /></Link>
    </section>
  );
}

export function BarbersSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <section id="barbers" className="gutter scroll-mt-8 border-t border-[var(--line-soft)] py-24">
      <SectionTitle label={config.name} title={t.home.barbersTitle} intro={t.home.barbersIntro} />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {config.barbers.map((b) => (
          <li key={b.id} className="flex flex-col gap-4 border border-[var(--line-soft)] p-6">
            <span aria-hidden className="grid size-14 place-items-center rounded-full border border-[var(--line)] font-display text-2xl italic text-accent">
              {b.name.slice(0, 1)}
            </span>
            <h3 className="font-display text-3xl">{b.name}</h3>
            <p className="text-sm text-ivory-dim">{b.bio[locale]}</p>
            <p className="text-xs text-ivory-dim">
              {b.serviceIds.map((id) => config.services.find((s) => s.id === id)?.name[locale]).filter(Boolean).join(" · ")}
            </p>
            <Link href={`/${locale}/book?barber=${b.id}`} className="link-underline mt-auto self-start">{fill(t.home.bookWith, { name: b.name })}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VisitSection({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <section id="visit" className="gutter scroll-mt-8 border-t border-[var(--line-soft)] py-24">
      <SectionTitle label={config.name} title={t.home.visitTitle} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          <div>
            <p className="label mb-2">{t.home.visitTitle}</p>
            <p className="font-display text-2xl">{config.address}</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href={directionsUrl(config.location)} target="_blank" rel="noopener noreferrer" className="btn">{t.home.directions}</a>
            <a href={config.location.mapsUrl} target="_blank" rel="noopener noreferrer" className="link-underline self-center">{t.home.openMaps}</a>
          </div>
          <div>
            <p className="label mb-3">{t.home.hoursTitle}</p>
            <table className="w-full max-w-sm text-sm">
              <tbody>
                {hoursTable(config, locale).map((r) => (
                  <tr key={r.day} className="border-t border-[var(--line-soft)]">
                    <td className="py-2 text-ivory-dim">{r.day}</td>
                    <td className="py-2 text-right tabular-nums">{r.hours ?? t.home.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <p><span className="text-ivory-dim">{t.home.phone}: </span><span className="select-all">{config.phone}</span></p>
            <p><span className="text-ivory-dim">{t.home.email}: </span><span className="select-all">{config.email}</span></p>
          </div>
        </div>
        <div className="relative min-h-[340px] overflow-hidden border border-[var(--line-soft)]">
          <iframe
            title={t.home.map}
            src={mapEmbedUrl(config.location)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full grayscale invert-[.92] contrast-[.9]"
          />
        </div>
      </div>
    </section>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <footer className="gutter flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line-soft)] py-8 text-xs text-ivory-dim">
      <p>© {new Date().getFullYear()} {config.legalName}</p>
      <nav className="flex gap-6">
        <Link href={`/${locale}/privacy`} className="hover:text-ivory">{t.footer.privacy}</Link>
        <Link href="/admin" className="hover:text-ivory">{t.footer.admin}</Link>
      </nav>
    </footer>
  );
}
