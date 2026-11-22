import type { Locale, SalonConfig } from "@/config/schema";
import type { BookingRow } from "@/db/schema";
import { formatDateTimeLong, formatPrice } from "@/lib/format";
import { isDemo } from "@/server/demo";

const COPY = {
  en: {
    subject: (salon: string) => `Your appointment at ${salon} is confirmed`,
    hello: (name: string) => `Hi ${name},`,
    intro: "Your appointment is confirmed:",
    service: "Service", barber: "Barber", when: "When", price: "Price", where: "Where",
    manage: "View or cancel your appointment",
    footer: "Can't make it? Please cancel using the link above so someone else can take the slot.",
  },
  es: {
    subject: (salon: string) => `Tu cita en ${salon} está confirmada`,
    hello: (name: string) => `Hola ${name}:`,
    intro: "Tu cita está confirmada:",
    service: "Servicio", barber: "Barbero", when: "Cuándo", price: "Precio", where: "Dónde",
    manage: "Ver o cancelar tu cita",
    footer: "¿No puedes venir? Cancela con el enlace de arriba para que otra persona pueda usar el hueco.",
  },
} satisfies Record<Locale, unknown>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderConfirmation(booking: BookingRow, config: SalonConfig, manageUrl: string): { subject: string; html: string; text: string } {
  const locale = (config.locales.includes(booking.locale as Locale) ? booking.locale : config.defaultLocale) as Locale;
  const t = COPY[locale];
  const service = config.services.find((s) => s.id === booking.serviceId)?.name[locale] ?? booking.serviceName;
  const barber = config.barbers.find((b) => b.id === booking.barberId)?.name ?? booking.barberId;
  const rows: [string, string][] = [
    [t.service, service],
    [t.barber, barber],
    [t.when, formatDateTimeLong(booking.startsAt, config.timezone, locale)],
    [t.price, formatPrice(booking.priceCents, locale)],
    [t.where, `${config.name}, ${config.address}`],
  ];
  const name = booking.customerName ?? "";
  const text = [t.hello(name), "", t.intro, ...rows.map(([k, v]) => `${k}: ${v}`), "", `${t.manage}: ${manageUrl}`, "", t.footer, "", `${config.name} · ${config.phone}`].join("\n");
  const c = config.theme.colors;
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:${c.ink};color:${c.ivory};font-family:Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-family:Georgia,serif;font-style:italic;font-size:28px;margin:0 0 4px">${esc(config.name)}</p>
<p style="color:${c.accent};font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin:0 0 28px">${esc(config.address)}</p>
<p>${esc(t.hello(name))}</p><p>${esc(t.intro)}</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0 24px">${rows.map(([k, v]) => `<tr><td style="padding:8px 0;border-top:1px solid #333;color:${c.ivoryDim};font-size:13px">${esc(k)}</td><td style="padding:8px 0;border-top:1px solid #333;text-align:right">${esc(v)}</td></tr>`).join("")}</table>
<p><a href="${esc(manageUrl)}" style="display:inline-block;background:${c.primary};color:#fff;text-decoration:none;padding:14px 20px;font-size:12px;letter-spacing:.2em;text-transform:uppercase">${esc(t.manage)}</a></p>
<p style="color:${c.ivoryDim};font-size:13px">${esc(t.footer)}</p>
<p style="color:${c.ivoryDim};font-size:13px">${esc(config.name)} · ${esc(config.phone)}</p>
</div></body></html>`;
  return { subject: t.subject(config.name), html, text };
}

/** Sends the confirmation email. 'skipped' in demo mode or without an address, 'logged' without a Resend key. */
export async function sendConfirmation(booking: BookingRow, config: SalonConfig, manageUrl: string): Promise<"sent" | "logged" | "skipped"> {
  if (isDemo() || !booking.customerEmail) return "skipped";
  const mail = renderConfirmation(booking, config, manageUrl);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] to=${booking.customerEmail} subject="${mail.subject}"\n${mail.text}`);
    return "logged";
  }
  const { Resend } = await import("resend");
  const { error } = await new Resend(key).emails.send({
    from: process.env.EMAIL_FROM || `${config.name} <onboarding@resend.dev>`,
    to: booking.customerEmail, subject: mail.subject, html: mail.html, text: mail.text,
  });
  if (error) {
    console.error("[email] Resend error", error);
    return "logged";
  }
  return "sent";
}
