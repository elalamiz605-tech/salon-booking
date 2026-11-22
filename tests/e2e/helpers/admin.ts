import { expect, type Page } from "@playwright/test";
import { E2E_ADMIN } from "../../../playwright.config";

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** A Madrid calendar date `days` ahead that falls on Tuesday–Thursday (open for every barber except Marco on Wednesday). */
export function openDayAhead(days: number): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
  for (let d = days; d < days + 7; d++) {
    const parts = fmt.formatToParts(new Date(Date.now() + d * 86_400_000));
    const get = (t: string) => parts.find((p) => p.type === t)!.value;
    if (["Tue", "Thu"].includes(get("weekday"))) return `${get("year")}-${get("month")}-${get("day")}`;
  }
  throw new Error("no open day found");
}
