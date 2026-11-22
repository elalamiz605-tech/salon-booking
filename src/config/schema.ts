import { z } from "zod";

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time must be HH:mm");
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

const localized = z.object({ en: z.string().min(1), es: z.string().min(1) });
export type Localized = z.infer<typeof localized>;

const dayHours = z.object({ open: hhmm, close: hhmm }).nullable();
export type DayHours = z.infer<typeof dayHours>;

const weekHours = z.object({
  0: dayHours, 1: dayHours, 2: dayHours, 3: dayHours, 4: dayHours, 5: dayHours, 6: dayHours,
});
export type WeekHours = z.infer<typeof weekHours>;
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const service = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: localized,
  description: localized,
  durationMin: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  bufferMin: z.number().int().nonnegative(),
});
export type Service = z.infer<typeof service>;

const barber = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  bio: localized,
  serviceIds: z.array(z.string()).min(1),
  hours: weekHours.partial().optional(),
  daysOff: z.array(z.number().int().min(0).max(6)),
});
export type Barber = z.infer<typeof barber>;

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const salonConfigSchema = z
  .object({
    name: z.string().min(1),
    legalName: z.string().min(1),
    tagline: localized,
    address: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    timezone: z.string().min(1),
    currency: z.literal("EUR"),
    locales: z.array(z.enum(LOCALES)).min(1),
    defaultLocale: z.enum(LOCALES),
    theme: z.object({
      colors: z.object({ ink: color, ivory: color, ivoryDim: color, accent: color, primary: color, primaryHover: color }),
      fonts: z.object({ display: z.string().min(1), body: z.string().min(1) }),
    }),
    hero: z.object({
      photo: z.string().min(1),
      depth: z.string().min(1),
      video: z.object({ mp4: z.string().min(1), webm: z.string().min(1) }).nullable(),
    }),
    location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), mapsUrl: z.string().url() }),
    openingHours: weekHours,
    slotStepMin: z.number().int().positive(),
    minNoticeMin: z.number().int().nonnegative(),
    bookingWindowDays: z.number().int().positive(),
    cancelCutoffMin: z.number().int().nonnegative(),
    retentionMonths: z.number().int().positive(),
    rateLimitPerHour: z.number().int().positive(),
    services: z.array(service).min(1),
    barbers: z.array(barber).min(1),
  })
  .superRefine((c, ctx) => {
    const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: "custom", message, path });
    const checkHours = (h: Partial<WeekHours> | undefined, path: (string | number)[]) => {
      for (const [day, v] of Object.entries(h ?? {})) {
        if (v && toMinutes(v.close) <= toMinutes(v.open)) issue("close must be after open", [...path, day]);
      }
    };
    checkHours(c.openingHours, ["openingHours"]);
    if (!c.locales.includes(c.defaultLocale)) issue("defaultLocale must be one of locales", ["defaultLocale"]);
    const serviceIds = new Set<string>();
    c.services.forEach((s, i) => {
      if (serviceIds.has(s.id)) issue(`duplicate service id "${s.id}"`, ["services", i, "id"]);
      serviceIds.add(s.id);
    });
    const barberIds = new Set<string>();
    c.barbers.forEach((b, i) => {
      if (barberIds.has(b.id)) issue(`duplicate barber id "${b.id}"`, ["barbers", i, "id"]);
      barberIds.add(b.id);
      b.serviceIds.forEach((id) => {
        if (!serviceIds.has(id)) issue(`unknown service "${id}"`, ["barbers", i, "serviceIds"]);
      });
      checkHours(b.hours, ["barbers", i, "hours"]);
    });
  });

export type SalonConfig = z.infer<typeof salonConfigSchema>;

/** Validates a salon configuration and returns it, or throws a readable error. */
export function defineConfig(c: SalonConfig): SalonConfig {
  const result = salonConfigSchema.safeParse(c);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid salon.config.ts:\n${lines.join("\n")}`);
  }
  return result.data;
}
