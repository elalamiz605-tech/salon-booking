import type { Locale } from "@/config/schema";
import { en } from "./en";
import { es } from "./es";

type Widen<T> = T extends string ? string : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };
/** The shape every language must provide: same keys as English, any text. */
export type Dict = Widen<typeof en>;

const DICTS: Record<Locale, Dict> = { en, es };

export { en, es };
export const getDict = (locale: Locale): Dict => DICTS[locale];

/** Replaces {name} placeholders. */
export const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

export { formatDateLong, formatDateTimeLong, formatPrice, formatTime } from "@/lib/format";
