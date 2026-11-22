import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "../../globals.css";
import config from "@config";
import { themeStyle } from "@/lib/theme";

export const metadata: Metadata = { title: { default: `Admin · ${config.name}`, template: `%s · Admin · ${config.name}` }, robots: { index: false } };

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={themeStyle()}>
      <body>{children}</body>
    </html>
  );
}
