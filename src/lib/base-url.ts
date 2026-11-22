/**
 * The absolute base URL used in email links. In production it comes from configuration only
 * (APP_URL, or Vercel's production URL), never from request headers a client could forge.
 */
export function resolveBaseUrl(o: {
  appUrl?: string;
  production: boolean;
  vercelProductionUrl?: string;
  host?: string | null;
  forwardedHost?: string | null;
}): string {
  if (o.appUrl) return o.appUrl.replace(/\/$/, "");
  if (o.production) {
    if (o.vercelProductionUrl) return `https://${o.vercelProductionUrl.replace(/\/$/, "")}`;
    throw new Error("Set APP_URL to the site's public address (used in email links)");
  }
  const host = o.host || "localhost:3000";
  return `${host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https"}://${host}`;
}
