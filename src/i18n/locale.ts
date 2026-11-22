import { notFound } from "next/navigation";
import config from "@config";
import type { Locale } from "@/config/schema";

/** Validates the [locale] route segment against the salon's configured languages. */
export function asLocale(value: string): Locale {
  if (!(config.locales as string[]).includes(value)) notFound();
  return value as Locale;
}
