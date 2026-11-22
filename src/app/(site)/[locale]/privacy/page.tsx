import type { Metadata } from "next";
import config from "@config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/home/Sections";
import { fill, getDict } from "@/i18n";
import { asLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getDict(asLocale((await params).locale)).privacy.title };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale).privacy;
  const vars = { legalName: config.legalName, address: config.address, email: config.email, months: config.retentionMonths };
  const sections: [string, string][] = [
    [t.who, fill(t.whoBody, vars)],
    [t.what, t.whatBody],
    [t.why, t.whyBody],
    [t.keep, fill(t.keepBody, vars)],
    [t.rights, fill(t.rightsBody, vars)],
  ];
  return (
    <>
      <Header locale={locale} sectionLinks={false} />
      <main className="gutter mx-auto flex w-full max-w-3xl flex-col gap-8 pb-24 pt-6">
        <h1 className="font-display text-[clamp(2.4rem,6vw,3.6rem)] leading-none">{t.title}</h1>
        {sections.map(([h, body]) => (
          <section key={h} className="flex flex-col gap-2 border-t border-[var(--line-soft)] pt-5">
            <h2 className="font-display text-2xl">{h}</h2>
            <p className="text-ivory-dim">{body}</p>
          </section>
        ))}
        <p className="text-xs text-ivory-dim">{t.template}</p>
      </main>
      <Footer locale={locale} />
    </>
  );
}
