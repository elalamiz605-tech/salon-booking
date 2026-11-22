"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Locale } from "@/config/schema";
import type { Dict } from "@/i18n";
import { submitBooking } from "./actions";

export type FormData = {
  locale: Locale;
  services: { id: string; name: string; description: string; durationMin: number; price: string }[];
  barbers: { id: string; name: string; bio: string; serviceIds: string[] }[];
  dates: string[];
  initialBarber: string | null;
  initialService: string | null;
  t: Dict["book"];
};

type Step = "service" | "barber" | "date" | "time" | "details";
const STEPS: Step[] = ["service", "barber", "date", "time", "details"];
type SlotView = { start: string; time: string };

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

function dateParts(date: string, locale: Locale) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { timeZone: "UTC", ...o }).format(dt);
  return { weekday: fmt({ weekday: "short" }), day: fmt({ day: "numeric" }), month: fmt({ month: "short" }), long: fmt({ weekday: "long", day: "numeric", month: "long" }) };
}

export function BookingForm({ data }: { data: FormData }) {
  const { t, locale } = data;
  const router = useRouter();
  const [step, setStep] = useState<Step>(data.initialService ? (data.initialBarber ? "date" : "barber") : "service");
  const [serviceId, setServiceId] = useState<string | null>(data.initialService);
  const [barberId, setBarberId] = useState<string | null>(data.initialBarber);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotView | null>(null);
  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [slotsKey, setSlotsKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const service = data.services.find((s) => s.id === serviceId) ?? null;
  const barber = data.barbers.find((b) => b.id === barberId) ?? null;
  const barbersForService = useMemo(() => data.barbers.filter((b) => !serviceId || b.serviceIds.includes(serviceId)), [data.barbers, serviceId]);

  useEffect(() => {
    if (step !== "time" || !date || !serviceId) return;
    let cancelled = false;
    fetch(`/api/availability?date=${date}&service=${serviceId}&barber=${barberId ?? "any"}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { slots?: SlotView[] }) => { if (!cancelled) setSlots(j.slots ?? []); })
      .catch(() => { if (!cancelled) setSlots([]); });
    return () => { cancelled = true; };
  }, [step, date, serviceId, barberId, slotsKey]);

  const go = (s: Step) => { setNotice(null); setStep(s); };
  const back = () => {
    const i = STEPS.indexOf(step);
    let prev = STEPS[Math.max(0, i - 1)];
    if (prev === "barber" && data.initialBarber && barber?.serviceIds.includes(serviceId ?? "")) prev = "service";
    go(prev);
  };

  function chooseService(id: string) {
    setServiceId(id);
    const keep = barberId && data.barbers.find((b) => b.id === barberId)?.serviceIds.includes(id);
    if (!keep) setBarberId(null);
    go(keep && data.initialBarber ? "date" : "barber");
  }

  async function submit(form: HTMLFormElement) {
    const fd = new window.FormData(form);
    const errs: Record<string, string> = {};
    if (String(fd.get("name") ?? "").trim().length < 2) errs.name = t.errors.name;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fd.get("email") ?? "").trim())) errs.email = t.errors.email;
    if (fd.get("consent") !== "yes") errs.consent = t.errors.consent;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    fd.set("serviceId", serviceId!); fd.set("barberId", barberId ?? "any"); fd.set("start", slot!.start); fd.set("locale", locale);
    startTransition(async () => {
      const res = await submitBooking(fd);
      if (res.ok) { router.push(`/${locale}/booking/${res.token}`); return; }
      if (res.error === "slotTaken") {
        setSlot(null); setSlots(null); setSlotsKey((k) => k + 1); setStep("time"); setNotice(t.errors.slotTaken);
      } else if (res.error === "validation" && res.field) {
        setErrors({ [res.field]: (t.errors as Record<string, string>)[res.field] ?? t.errors.generic });
      } else {
        setNotice(res.error === "rateLimited" ? t.errors.rateLimited : t.errors.generic);
      }
    });
  }

  const stepIndex = STEPS.indexOf(step);
  const card = "flex w-full items-baseline gap-4 border border-[var(--line-soft)] p-5 text-left transition-colors hover:border-accent focus-visible:border-accent";

  return (
    <div className="flex flex-col gap-8">
      <ol className="grid grid-cols-5 gap-2" aria-label={t.title}>
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-col gap-2">
            <span className={`h-px ${i <= stepIndex ? "bg-accent" : "bg-[var(--line-soft)]"}`} />
            <span className={`text-[.62rem] uppercase tracking-[.2em] max-sm:hidden ${i === stepIndex ? "text-accent" : "text-ivory-dim"}`}>{t.steps[s]}</span>
          </li>
        ))}
      </ol>

      {(service || barber || date || slot) && step !== "service" && (
        <p className="text-sm text-ivory-dim">
          {[service?.name, barber ? barber.name : stepIndex > 1 ? t.anyBarber : null, date ? dateParts(date, locale).long : null, slot?.time].filter(Boolean).join(" · ")}
        </p>
      )}

      {notice && <p role="alert" className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--primary)_25%,transparent)] p-4 text-sm">{notice}</p>}

      {step === "service" && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-3xl">{t.chooseService}</h2>
          {data.services.map((s) => (
            <button key={s.id} type="button" className={card} onClick={() => chooseService(s.id)}>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl">{s.name}</span>
                <span className="mt-1 block text-sm text-ivory-dim">{s.description}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-display text-2xl">{s.price}</span>
                <span className="block text-xs text-ivory-dim">{fill(t.duration, { n: s.durationMin })}</span>
              </span>
            </button>
          ))}
        </section>
      )}

      {step === "barber" && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-3xl">{t.chooseBarber}</h2>
          <button type="button" className={card} onClick={() => { setBarberId(null); go("date"); }}>
            <span className="min-w-0 flex-1"><span className="block font-display text-2xl">{t.anyBarber}</span><span className="block text-sm text-ivory-dim">{t.anyBarberHint}</span></span>
          </button>
          {barbersForService.map((b) => (
            <button key={b.id} type="button" className={card} onClick={() => { setBarberId(b.id); go("date"); }}>
              <span className="min-w-0 flex-1"><span className="block font-display text-2xl">{b.name}</span><span className="block text-sm text-ivory-dim">{b.bio}</span></span>
            </button>
          ))}
        </section>
      )}

      {step === "date" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-3xl">{t.chooseDate}</h2>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {data.dates.map((d) => {
              const p = dateParts(d, locale);
              return (
                <button key={d} type="button" data-date={d} aria-label={p.long}
                  className={`flex w-[4.5rem] shrink-0 flex-col items-center gap-1 border p-3 transition-colors hover:border-accent ${d === date ? "border-accent bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]" : "border-[var(--line-soft)]"}`}
                  onClick={() => { setDate(d); setSlot(null); setSlots(null); go("time"); }}>
                  <span className="text-[.65rem] uppercase tracking-[.15em] text-ivory-dim">{p.weekday}</span>
                  <span className="font-display text-2xl">{p.day}</span>
                  <span className="text-[.65rem] uppercase tracking-[.15em] text-ivory-dim">{p.month}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === "time" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-3xl">{t.chooseTime}</h2>
          {slots === null ? (
            <p className="text-ivory-dim">{t.loading}</p>
          ) : slots.length === 0 ? (
            <p className="text-ivory-dim">{t.noSlots}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((s) => (
                <button key={s.start} type="button" data-slot={s.start}
                  className="border border-[var(--line-soft)] py-3 text-center tabular-nums transition-colors hover:border-accent"
                  onClick={() => { setSlot(s); go("details"); }}>
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {step === "details" && service && slot && (
        <form className="flex flex-col gap-5" noValidate onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
          <h2 className="font-display text-3xl">{t.details}</h2>
          <Field id="name" label={t.name} error={errors.name}><input id="name" name="name" autoComplete="name" required className="input" /></Field>
          <Field id="email" label={t.email} hint={t.emailHint} error={errors.email}><input id="email" name="email" type="email" autoComplete="email" required className="input" /></Field>
          <Field id="phone" label={t.phone}><input id="phone" name="phone" type="tel" autoComplete="tel" className="input" /></Field>
          <Field id="notes" label={t.notes}><textarea id="notes" name="notes" rows={3} maxLength={500} className="input" /></Field>
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="company">Company</label><input id="company" name="company" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-3 text-sm">
              <input id="consent" type="checkbox" name="consent" value="yes" className="mt-1 size-4 accent-[var(--accent)]" />
              <span>{t.consentBefore} <Link href={`/${locale}/privacy`} target="_blank" className="underline decoration-[var(--accent)] underline-offset-4">{t.consentLink}</Link></span>
            </label>
            {errors.consent && <p className="text-sm text-[#f0a3a3]">{errors.consent}</p>}
          </div>
          <div className="border-t border-[var(--line-soft)] pt-5">
            <p className="label mb-2">{t.review}</p>
            <p className="font-display text-2xl">{service.name} · {service.price}</p>
            <p className="text-ivory-dim">{date && dateParts(date, locale).long} · {slot.time} · {barber ? fill(t.with, { name: barber.name }) : t.anyBarber}</p>
          </div>
          <button type="submit" className="btn self-start" disabled={pending}>{pending ? t.submitting : t.submit}</button>
        </form>
      )}

      {step !== "service" && (
        <button type="button" onClick={back} className="link-underline self-start">{t.back}</button>
      )}
    </div>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-ivory-dim">{hint}</p>}
      {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
    </div>
  );
}
