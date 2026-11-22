import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    barberId: text("barber_id").notNull(),
    serviceId: text("service_id").notNull(),
    // Snapshot of the service at booking time, so later config changes never alter a booking.
    serviceName: text("service_name").notNull(),
    durationMin: integer("duration_min").notNull(),
    priceCents: integer("price_cents").notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    // endsAt + the service's buffer: the period the barber is unavailable.
    occupiedUntil: ts("occupied_until").notNull(),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    notes: text("notes"),
    locale: text("locale").notNull(),
    status: text("status", { enum: ["confirmed", "cancelled", "no_show"] }).notNull(),
    source: text("source", { enum: ["online", "admin"] }).notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    cancelledAt: ts("cancelled_at"),
    anonymizedAt: ts("anonymized_at"),
  },
  (t) => [
    index("bookings_starts_at_idx").on(t.startsAt),
    check("bookings_status_check", sql`${t.status} in ('confirmed','cancelled','no_show')`),
    check("bookings_source_check", sql`${t.source} in ('online','admin')`),
    check("bookings_time_check", sql`${t.endsAt} > ${t.startsAt} and ${t.occupiedUntil} >= ${t.endsAt}`),
  ],
);

export const timeBlocks = pgTable(
  "time_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = the whole salon is closed.
    barberId: text("barber_id"),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    reason: text("reason"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [check("time_blocks_time_check", sql`${t.endsAt} > ${t.startsAt}`)],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: ts("window_start").notNull(),
    count: integer("count").notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type BookingRow = typeof bookings.$inferSelect;
export type TimeBlockRow = typeof timeBlocks.$inferSelect;
