import type { Metadata } from "next";
import config from "@config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/home/Sections";
import { formatPrice, getDict } from "@/i18n";
import { asLocale } from "@/i18n/locale";
import { bookableDates } from "@/lib/availability";
import { siteDb } from "@/server/site";
import { BookingForm, type FormData as BookingFormData } from "./BookingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getDict(asLocale((await params).locale)).book.title };
}

export default async function BookPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ barber?: string; service?: string }> }) {
  const locale = asLocale((await params).locale);
  const sp = await searchParams;
  await siteDb();
  const t = getDict(locale);
  const data: BookingFormData = {
    locale,
    services: config.services.map((s) => ({ id: s.id, name: s.name[locale], description: s.description[locale], durationMin: s.durationMin, price: formatPrice(s.priceCents, locale) })),
    barbers: config.barbers.map((b) => ({ id: b.id, name: b.name, bio: b.bio[locale], serviceIds: b.serviceIds })),
    dates: bookableDates(config, new Date()),
    initialBarber: config.barbers.some((b) => b.id === sp.barber) ? sp.barber! : null,
    initialService: config.services.some((s) => s.id === sp.service) ? sp.service! : null,
    t: t.book,
  };
  return (
    <>
      <Header locale={locale} sectionLinks={false} />
      <main className="gutter mx-auto w-full max-w-3xl pb-24 pt-6">
        <h1 className="mb-8 font-display text-[clamp(2.4rem,6vw,3.6rem)] leading-none">{t.book.title}</h1>
        <BookingForm data={data} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
