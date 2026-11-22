import Link from "next/link";
import config from "@config";
import { Header } from "@/components/Header";
import { CursorRing } from "@/components/hero/CursorRing";
import { HeroScene } from "@/components/hero/HeroScene";
import { OpeningStatusText } from "@/components/home/OpeningStatusText";
import { BarbersSection, Footer, ServicesSection, VisitSection } from "@/components/home/Sections";
import { fill, formatPrice, getDict } from "@/i18n";
import { asLocale } from "@/i18n/locale";
import { hoursSummary } from "@/lib/hours";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const words = config.services.map((s) => s.name[locale]);
  const marquee = [...words, ...words, ...words, ...words];
  const [first, second] = config.services;

  return (
    <>
      <section className="hero">
        <HeroScene photo={config.hero.photo} depth={config.hero.depth} video={config.hero.video} />
        <Header locale={locale} />
        <div className="gutter flex">
          <div className="hero-copy">
            <p className="hero-overline">{config.tagline[locale]}</p>
            <h1 className="hero-title">
              <span className="line"><span>{t.hero.line1}</span></span>
              <span className="line"><span><em>{t.hero.line2}</em></span></span>
            </h1>
            <p className="hero-lede">{t.hero.lede}</p>
            <div className="hero-ctas">
              <Link href={`/${locale}/book`} className="btn">{t.hero.cta}<span className="arr" aria-hidden /></Link>
              <a href="#services" className="link-underline">{t.hero.services}</a>
            </div>
            <OpeningStatusText locale={locale} initialNow={new Date().toISOString()} />
          </div>
        </div>
        <div className="gutter">
          <div className="marquee" aria-hidden="true">
            <div className="marquee-track">
              {marquee.map((w, i) => (
                <span key={i} className="contents">
                  <span className="marquee-word">{w}</span>
                  <span className="marquee-sep" />
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="gutter">
          <div className="rail">
            {[first, second].filter(Boolean).map((s) => (
              <div key={s.id} className="rail-item">
                <span className="label">{s.name[locale]}</span>
                <span className="rail-value">{formatPrice(s.priceCents, locale)} <small>{fill(t.book.duration, { n: s.durationMin })}</small></span>
              </div>
            ))}
            <div className="rail-item"><span className="label">{t.rail.hours}</span><span className="rail-value">{hoursSummary(config, locale)}</span></div>
            <div className="rail-item"><span className="label">{t.rail.findUs}</span><span className="rail-value">{config.address.split(",")[0]}</span></div>
          </div>
        </div>
      </section>
      <main>
        <ServicesSection locale={locale} />
        <BarbersSection locale={locale} />
        <VisitSection locale={locale} />
      </main>
      <Footer locale={locale} />
      <CursorRing />
    </>
  );
}
