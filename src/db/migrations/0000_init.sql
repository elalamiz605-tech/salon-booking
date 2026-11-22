CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"barber_id" text NOT NULL,
	"service_id" text NOT NULL,
	"service_name" text NOT NULL,
	"duration_min" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"occupied_until" timestamp with time zone NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"notes" text,
	"locale" text NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"anonymized_at" timestamp with time zone,
	CONSTRAINT "bookings_token_unique" UNIQUE("token"),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('confirmed','cancelled','no_show')),
	CONSTRAINT "bookings_source_check" CHECK ("bookings"."source" in ('online','admin')),
	CONSTRAINT "bookings_time_check" CHECK ("bookings"."ends_at" > "bookings"."starts_at" and "bookings"."occupied_until" >= "bookings"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barber_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_blocks_time_check" CHECK ("time_blocks"."ends_at" > "time_blocks"."starts_at")
);
--> statement-breakpoint
CREATE INDEX "bookings_starts_at_idx" ON "bookings" USING btree ("starts_at");