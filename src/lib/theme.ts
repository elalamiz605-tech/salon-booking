import type { CSSProperties } from "react";
import config from "@config";

/** CSS variables for the salon's colours and fonts, set on <html>. */
export function themeStyle(): CSSProperties {
  const c = config.theme.colors;
  return {
    "--ink": c.ink, "--ivory": c.ivory, "--ivory-dim": c.ivoryDim, "--accent": c.accent,
    "--primary": c.primary, "--primary-hover": c.primaryHover,
    "--font-display-name": `"${config.theme.fonts.display}"`, "--font-body-name": `"${config.theme.fonts.body}"`,
  } as CSSProperties;
}
