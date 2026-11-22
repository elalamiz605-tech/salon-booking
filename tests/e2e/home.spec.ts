import { expect, test } from "@playwright/test";
import config from "../../salon.config";

test.describe("home page", () => {
  test("shows the headline, switches language and links to booking", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/The art of\s*the cut\./);
    await expect(page).toHaveTitle(new RegExp(config.name));
    await page.getByRole("link", { name: "ES", exact: true }).click();
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/El arte\s*del corte\./);
    await page.getByRole("link", { name: "Reserva tu sillón" }).first().click();
    await expect(page).toHaveURL(/\/es\/book$/);
  });

  test("find us section has the map and directions", async ({ page }) => {
    await page.goto("/en");
    const map = page.locator('iframe[title="Map"]');
    await expect(map).toHaveAttribute("src", new RegExp(`q=${config.location.lat},${config.location.lng}.*output=embed`));
    await expect(page.getByRole("link", { name: "Get directions" })).toHaveAttribute("href", /google\.com\/maps\/dir/);
    await expect(page.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute("href", config.location.mapsUrl);
    for (const s of config.services) await expect(page.getByText(s.name.en, { exact: true }).first()).toBeVisible();
  });

  test("reduced motion keeps the still photo", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/en");
    await expect(page.locator("img.hero-photo")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => document.documentElement.classList.contains("gl-ready"))).toBe(false);
    await context.close();
  });

  test("no horizontal scroll", async ({ page }) => {
    await page.goto("/en");
    await page.waitForTimeout(500);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
  });
});
