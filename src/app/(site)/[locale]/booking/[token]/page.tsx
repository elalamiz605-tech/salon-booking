import type { Metadata } from "next";
import Link from "next/link";
import config from "@config";
import { Header } from "@/components/Header";
import { Footer } from "@/components/home/Sections";
import { fill, formatDateTimeLong, formatPrice, getDict } from "@/i18n";
import { asLocale } from "@/i18n/locale";
import { manageViewState } from "@/lib/manage-state";
import { getBookingByToken } from "@/server/bookings";
import { isDemo } from "@/server/demo";
import { renderConfirmation } from "@/server/email";
import { baseUrl, siteDb } from "@/server/site";
import { CancelButton } from "./CancelButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

export default async function ManagePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale: raw, token } = await params;
  const locale = asLocale(raw);
  const t = getDict(locale);
  const booking = await getBookingByToken(await siteDb(), token);
  const state = manageViewState(booking, new Date(), config);
  const path = `/${locale}/booking/${token}`;
  const url = `${await baseUrl().catch(() => "")}${path}`;

  const heading = { confirmed: t.manage.booked, tooLate: booking?.status === "cancelled" ? t.manage.cancelled : t.manage.tooLate, cancelled: t.manage.cancelled, anonymized: t.manage.anonymized, unknown: t.manage.notFound }[state];
  const intro = {
    confirmed: t.manage.bookedIntro,
    tooLate: fill(t.manage.tooLateIntro, { phone: config.phone }),
    cancelled: t.manage.cancelledIntro,
    anonymized: "",
    unknown: t.manage.notFoundIntro,
  }[state];

  const service = booking && (config.services.find((s) => s.id === booking.serviceId)?.name[locale] ?? booking.serviceName);
  const barber = booking && (config.barbers.find((b) => b.id === booking.barberId)?.name ?? booking.barberId);
  const showDetails = booking && (state === "confirmed" || state === "tooLate" || state === "cancelled");

  return (
    <>
      <Header locale={locale} sectionLinks={false} />
      <main className="gutter mx-auto flex w-full max-w-3xl flex-col gap-8 pb-24 pt-6">
        <div className="flex flex-col gap-3">
          <p className="label">{config.name}</p>
          <h1 className="font-display text-[clamp(2.4rem,6vw,3.6rem)] leading-none">{heading}</h1>
          {intro && <p className="text-ivory-dim">{intro}</p>}
        </div>

        {showDetails && (
          <dl className={`grid grid-cols-[auto_1fr] gap-x-8 ${state === "cancelled" ? "opacity-60" : ""}`}>
            {[
              [t.manage.when, formatDateTimeLong(booking.startsAt, config.timezone, locale)],
              [t.manage.service, service],
              [t.manage.barber, barber],
              [t.manage.price, formatPrice(booking.priceCents, locale)],
              [t.manage.where, config.address],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="border-t border-[var(--line-soft)] py-3 text-sm text-ivory-dim">{k}</dt>
                <dd className="border-t border-[var(--line-soft)] py-3 text-right font-display text-xl">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {state === "confirmed" && (
          <div className="flex flex-wrap items-center gap-6">
            <CancelButton token={token} locale={locale} labels={{ cancel: t.manage.cancel, ask: t.manage.cancelAsk, yes: t.manage.cancelYes, no: t.manage.cancelNo }} />
            <a href={`/${locale}/booking/${token}/ics`} className="link-underline">{t.manage.addToCalendar}</a>
          </div>
        )}

        {state === "confirmed" && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-ivory-dim">{t.manage.keepLink}</p>
            <p className="select-all break-all border border-[var(--line-soft)] p-3 font-mono text-xs">{url}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-6">
          <Link href={`/${locale}/book`} className="btn">{t.manage.bookAgain}</Link>
          <Link href={`/${locale}`} className="link-underline self-center">{t.manage.backHome}</Link>
        </div>

        {isDemo() && booking && state === "confirmed" && (
          <section className="flex flex-col gap-3 border-t border-[var(--line-soft)] pt-8">
            <p className="label">{t.manage.demoEmail}</p>
            <iframe title={t.manage.demoEmail} sandbox="" srcDoc={renderConfirmation(booking, config, url).html} className="h-[640px] w-full border border-[var(--line-soft)] bg-ink" />
          </section>
        )}
      </main>
      <Footer locale={locale} />
    </>
  );
}
