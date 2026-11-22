/**
 * Everything that changes from one salon to another lives in this file.
 * To set the site up for a new client: edit this file, replace the files in public/hero/,
 * then redeploy. No other code changes are needed.
 */
import { defineConfig } from "./src/config/schema";

const allServices = ["scissor-cut", "skin-fade", "beard-sculpt", "hot-towel-shave", "blow-dry-style", "kids-cut", "grey-blending"];

export default defineConfig({
  name: "Rizo Studio",
  legalName: "Rizo Studio S.L.",
  tagline: { en: "Gentlemen's barbers · Malasaña", es: "Barbería de caballeros · Malasaña" },
  address: "Calle del Pez 21, 28004 Madrid",
  phone: "+34 910 000 000",
  email: "hola@rizostudio.example",
  timezone: "Europe/Madrid",
  currency: "EUR",
  locales: ["en", "es"],
  defaultLocale: "en",
  theme: {
    colors: { ink: "#0b0b0c", ivory: "#ece9e4", ivoryDim: "#aaa6a0", accent: "#cbb894", primary: "#6b1420", primaryHover: "#84202e" },
    fonts: { display: "Cormorant Garamond", body: "Manrope" },
  },
  hero: { photo: "/hero/hero.webp", depth: "/hero/depth.webp", video: { mp4: "/hero/hero.mp4", webm: "/hero/hero.webm" } },
  location: { lat: 40.4256, lng: -3.7068, mapsUrl: "https://www.google.com/maps?q=40.4256,-3.7068" },
  // 0 = Sunday … 6 = Saturday. null = closed.
  openingHours: {
    0: null,
    1: null,
    2: { open: "10:00", close: "20:00" },
    3: { open: "10:00", close: "20:00" },
    4: { open: "10:00", close: "20:00" },
    5: { open: "10:00", close: "20:00" },
    6: { open: "10:00", close: "20:00" },
  },
  slotStepMin: 15,
  minNoticeMin: 120,
  bookingWindowDays: 30,
  cancelCutoffMin: 120,
  retentionMonths: 24,
  rateLimitPerHour: 5,
  services: [
    { id: "scissor-cut", durationMin: 45, priceCents: 3200, bufferMin: 5,
      name: { en: "Scissor cut", es: "Corte a tijera" },
      description: { en: "A classic cut shaped entirely with scissors, finished with a wash and style.", es: "Corte clásico hecho a tijera, con lavado y peinado final." } },
    { id: "skin-fade", durationMin: 40, priceCents: 2800, bufferMin: 5,
      name: { en: "Skin fade", es: "Degradado" },
      description: { en: "A sharp fade down to the skin, blended with clippers and finished by hand.", es: "Degradado a piel, fundido a máquina y rematado a mano." } },
    { id: "beard-sculpt", durationMin: 25, priceCents: 1800, bufferMin: 5,
      name: { en: "Beard sculpt", es: "Arreglo de barba" },
      description: { en: "Shape, line-up and hot towel for a clean, defined beard.", es: "Perfilado, contornos y toalla caliente para una barba definida." } },
    { id: "hot-towel-shave", durationMin: 40, priceCents: 2800, bufferMin: 5,
      name: { en: "Hot-towel shave", es: "Afeitado clásico" },
      description: { en: "A traditional straight-razor shave with hot towels and balm.", es: "Afeitado tradicional a navaja con toallas calientes y bálsamo." } },
    { id: "blow-dry-style", durationMin: 30, priceCents: 2000, bufferMin: 5,
      name: { en: "Blow-dry & style", es: "Secado y peinado" },
      description: { en: "Wash, blow-dry and styling for an event or simply a good day.", es: "Lavado, secado y peinado para un evento o un buen día." } },
    { id: "kids-cut", durationMin: 30, priceCents: 1800, bufferMin: 5,
      name: { en: "Kids' cut", es: "Corte infantil" },
      description: { en: "A relaxed cut for under-12s.", es: "Un corte tranquilo para menores de 12 años." } },
    { id: "grey-blending", durationMin: 30, priceCents: 2500, bufferMin: 5,
      name: { en: "Grey blending", es: "Matizado de canas" },
      description: { en: "A subtle tone that softens grey hair without looking dyed.", es: "Un tono sutil que suaviza las canas sin parecer teñido." } },
  ],
  barbers: [
    { id: "alvaro", name: "Álvaro", serviceIds: allServices, daysOff: [],
      bio: { en: "Founder. Classic scissor work and straight-razor shaves.", es: "Fundador. Tijera clásica y afeitado a navaja." } },
    { id: "marco", name: "Marco", serviceIds: allServices.filter((s) => s !== "hot-towel-shave"), daysOff: [3],
      bio: { en: "Fades and modern textures. Off on Wednesdays.", es: "Degradados y texturas modernas. Libra los miércoles." } },
    { id: "iker", name: "Iker", serviceIds: ["scissor-cut", "skin-fade", "kids-cut", "blow-dry-style"], daysOff: [],
      hours: { 2: { open: "12:00", close: "20:00" }, 3: { open: "12:00", close: "20:00" }, 4: { open: "12:00", close: "20:00" }, 5: { open: "12:00", close: "20:00" }, 6: { open: "12:00", close: "20:00" } },
      bio: { en: "Precise cuts and patient with kids. Afternoons.", es: "Cortes precisos y mucha paciencia con los peques. Por las tardes." } },
  ],
});
