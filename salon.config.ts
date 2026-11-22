/**
 * Barbería Plaza Barcelona, Salamanca — MOCK-UP to show the owner.
 * Do not deploy or publish under their name until the owner has agreed.
 *
 * TODO(confirm with owner) — every value below marked "placeholder" is a guess:
 *   - legal name (razón social) and email
 *   - phone / WhatsApp
 *   - opening hours (split shifts such as 10:00–14:00 / 16:30–20:30 need one entry per barber or a closed block)
 *   - services and prices
 *   - barbers' names, days off and hours
 *   - their own photos / video for public/hero/ (today: the Rizo demo media)
 */
import { defineConfig } from "./src/config/schema";

const all = ["corte", "degradado", "corte-barba", "barba", "afeitado", "infantil", "peinado"];

export default defineConfig({
  name: "Barbería Plaza Barcelona",
  legalName: "Barbería Plaza Barcelona (razón social por confirmar)", // placeholder
  tagline: { es: "Barbería · Garrido, Salamanca", en: "Barbershop · Garrido, Salamanca" },
  address: "Plaza de Barcelona, 17, 37004 Salamanca",
  phone: "+34 923 00 00 00", // placeholder
  email: "hola@barberiaplazabarcelona.example", // placeholder
  timezone: "Europe/Madrid",
  currency: "EUR",
  locales: ["es", "en"],
  defaultLocale: "es",
  theme: {
    colors: { ink: "#0b0b0c", ivory: "#ece9e4", ivoryDim: "#aaa6a0", accent: "#cbb894", primary: "#6b1420", primaryHover: "#84202e" },
    fonts: { display: "Cormorant Garamond", body: "Manrope" },
  },
  hero: { photo: "/hero/hero.webp", depth: "/hero/depth.webp", video: { mp4: "/hero/hero.mp4", webm: "/hero/hero.webm" } },
  location: { lat: 40.9734694, lng: -5.6493969, mapsUrl: "https://www.google.com/maps?q=40.9734694,-5.6493969" },
  // Placeholder hours: Monday–Saturday 10:00–20:00, closed Sunday.
  openingHours: {
    0: null,
    1: { open: "10:00", close: "20:00" },
    2: { open: "10:00", close: "20:00" },
    3: { open: "10:00", close: "20:00" },
    4: { open: "10:00", close: "20:00" },
    5: { open: "10:00", close: "20:00" },
    6: { open: "10:00", close: "14:00" },
  },
  slotStepMin: 15,
  minNoticeMin: 60,
  bookingWindowDays: 30,
  cancelCutoffMin: 120,
  retentionMonths: 24,
  rateLimitPerHour: 5,
  // Placeholder prices, typical for Salamanca.
  services: [
    { id: "corte", durationMin: 30, priceCents: 1200, bufferMin: 5,
      name: { es: "Corte de pelo", en: "Haircut" },
      description: { es: "Corte a máquina y tijera, con lavado y peinado.", en: "Clipper and scissor cut, with wash and style." } },
    { id: "degradado", durationMin: 35, priceCents: 1300, bufferMin: 5,
      name: { es: "Degradado", en: "Skin fade" },
      description: { es: "Degradado a piel con acabado a navaja.", en: "Skin fade finished with a razor." } },
    { id: "corte-barba", durationMin: 45, priceCents: 1700, bufferMin: 5,
      name: { es: "Corte + barba", en: "Cut + beard" },
      description: { es: "Corte completo y arreglo de barba con toalla caliente.", en: "Full cut plus beard trim with a hot towel." } },
    { id: "barba", durationMin: 20, priceCents: 800, bufferMin: 5,
      name: { es: "Arreglo de barba", en: "Beard trim" },
      description: { es: "Perfilado y contornos a navaja.", en: "Shaping and razor line-up." } },
    { id: "afeitado", durationMin: 30, priceCents: 1000, bufferMin: 5,
      name: { es: "Afeitado clásico", en: "Classic shave" },
      description: { es: "Afeitado a navaja con toallas calientes.", en: "Straight-razor shave with hot towels." } },
    { id: "infantil", durationMin: 25, priceCents: 1000, bufferMin: 5,
      name: { es: "Corte infantil", en: "Kids' cut" },
      description: { es: "Para menores de 12 años.", en: "For under-12s." } },
    { id: "peinado", durationMin: 20, priceCents: 800, bufferMin: 5,
      name: { es: "Lavado y peinado", en: "Wash & style" },
      description: { es: "Lavado, secado y peinado.", en: "Wash, blow-dry and style." } },
  ],
  // Placeholder team: replace with the real barbers.
  barbers: [
    { id: "barbero-1", name: "Barbero 1", serviceIds: all, daysOff: [],
      bio: { es: "Nombre y especialidad por confirmar.", en: "Name and speciality to be confirmed." } },
    { id: "barbero-2", name: "Barbero 2", serviceIds: all, daysOff: [1],
      bio: { es: "Nombre y especialidad por confirmar.", en: "Name and speciality to be confirmed." } },
  ],
});
