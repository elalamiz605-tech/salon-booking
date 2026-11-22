import { expect, type Page } from "@playwright/test";

/** Walks the booking form up to the time step; returns the chosen time label ("HH:mm"). */
export async function pickFirstSlot(page: Page, opts: { service: string; barber: string; locale?: string }) {
  const locale = opts.locale ?? "en";
  await page.goto(`/${locale}/book`);
  await page.getByRole("button", { name: new RegExp(`^${opts.service}`) }).click();
  await page.getByRole("button", { name: new RegExp(`^${opts.barber}`) }).click();
  const dates = page.locator("[data-date]");
  await expect(dates.first()).toBeVisible();
  const count = await dates.count();
  for (let i = 0; i < count; i++) {
    const date = (await dates.nth(i).getAttribute("data-date"))!;
    await dates.nth(i).click();
    const slots = page.locator("[data-slot]");
    const empty = page.getByText(/No free times|No quedan huecos/);
    await expect(slots.first().or(empty)).toBeVisible();
    if (await slots.count()) {
      const time = (await slots.first().textContent())!.trim();
      return { time, date, dateIndex: i };
    }
    await page.getByRole("button", { name: /Back|Atrás/ }).click();
  }
  throw new Error("no free slot in the booking window");
}

export async function fillDetails(page: Page, name = "Test Customer", email = "test@example.com") {
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
}
