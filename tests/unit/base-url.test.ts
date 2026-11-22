import { expect, test } from "vitest";
import { resolveBaseUrl } from "@/lib/base-url";

test("APP_URL wins", () => {
  expect(resolveBaseUrl({ appUrl: "https://salon.es/", production: true, host: "evil.test", forwardedHost: "evil.test" })).toBe("https://salon.es");
});
test("production never trusts forwarded or host headers", () => {
  expect(resolveBaseUrl({ production: true, vercelProductionUrl: "salon.vercel.app", host: "evil.test", forwardedHost: "evil.test" })).toBe("https://salon.vercel.app");
  expect(() => resolveBaseUrl({ production: true, host: "evil.test", forwardedHost: "evil.test" })).toThrow(/APP_URL/);
});
test("development uses the Host header, not x-forwarded-host", () => {
  expect(resolveBaseUrl({ production: false, host: "localhost:3000", forwardedHost: "evil.test" })).toBe("http://localhost:3000");
});
