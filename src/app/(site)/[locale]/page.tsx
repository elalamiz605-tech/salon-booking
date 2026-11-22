import { Header } from "@/components/Header";
import { getDict } from "@/i18n";
import { asLocale } from "@/i18n/locale";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  return (
    <>
      <Header locale={locale} />
      <main className="gutter">
        <h1 className="font-display text-6xl">{t.hero.line1} <em>{t.hero.line2}</em></h1>
      </main>
    </>
  );
}
