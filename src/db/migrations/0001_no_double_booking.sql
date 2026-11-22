-- A barber can never have two active bookings whose occupied periods overlap.
-- Enforced by PostgreSQL itself, so two simultaneous requests cannot both succeed.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("barber_id" WITH =, tstzrange("starts_at", "occupied_until", '[)') WITH &&)
  WHERE ("status" <> 'cancelled');
