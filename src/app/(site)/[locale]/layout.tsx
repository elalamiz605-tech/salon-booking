import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "../../globals.css";
import config from "@config";
import { getDict } from "@/i18n";
import { asLocale } from "@/i18n/locale";
import { themeStyle } from "@/lib/theme";

export function generateStaticParams() {
  return config.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return {
    title: { default: config.name, template: `%s · ${config.name}` },
    description: getDict(locale).meta.description,
  };
}

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  return (
    <html lang={locale} style={themeStyle()}>
      <body>{children}</body>
    </html>
  );
}
