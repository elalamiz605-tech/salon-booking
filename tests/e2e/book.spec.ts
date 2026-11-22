import { expect, test } from "@playwright/test";
import { fillDetails, pickFirstSlot } from "./helpers/book";

test.describe("booking flow", () => {
  test("books a slot end to end and the slot disappears", async ({ page }) => {
    const started = Date.now();
    const { time, date } = await pickFirstSlot(page, { service: "Scissor cut", barber: "Álvaro" });
    await page.getByRole("button", { name: time, exact: true }).click();
    await fillDetails(page);
    await page.getByLabel(/I accept the/).check();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page).toHaveURL(/\/en\/booking\/[\w-]{40,}$/);
    expect(Date.now() - started).toBeLessThan(60_000);

    await page.goto("/en/book");
    await page.getByRole("button", { name: /^Scissor cut/ }).click();
    await page.getByRole("button", { name: /^Álvaro/ }).click();
    await page.locator(`[data-date="${date}"]`).click();
    await expect(page.locator("[data-slot]").first().or(page.getByText("No free times"))).toBeVisible();
    await expect(page.getByRole("button", { name: time, exact: true })).toHaveCount(0);
  });

  test("asks for consent", async ({ page }) => {
    const { time } = await pickFirstSlot(page, { service: "Skin fade", barber: "Marco" });
    await page.getByRole("button", { name: time, exact: true }).click();
    await fillDetails(page);
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText("Please accept the privacy policy.")).toBeVisible();
  });

  test("same slot from two visitors: one wins, the other gets fresh times", async ({ browser }) => {
    const a = await (await browser.newContext()).newPage();
    const b = await (await browser.newContext()).newPage();
    const pick = await pickFirstSlot(a, { service: "Beard sculpt", barber: "Álvaro" });
    await pickFirstSlot(b, { service: "Beard sculpt", barber: "Álvaro" });
    for (const p of [a, b]) {
      await p.getByRole("button", { name: pick.time, exact: true }).click();
      await fillDetails(p, "Visitor " + (p === a ? "A" : "B"), (p === a ? "a" : "b") + "@example.com");
      await p.getByLabel(/I accept the/).check();
    }
    await a.getByRole("button", { name: "Confirm booking" }).click();
    await expect(a).toHaveURL(/\/en\/booking\//);
    await b.getByRole("button", { name: "Confirm booking" }).click();
    await expect(b.getByText("This time was just taken. Here are the next free times.")).toBeVisible();
    await expect(b.getByRole("button", { name: pick.time, exact: true })).toHaveCount(0);
    await expect(b.locator("[data-slot]").first()).toBeVisible();
  });

  test("works in Spanish and from a barber link", async ({ page }) => {
    await page.goto("/es/book?barber=iker");
    await page.getByRole("button", { name: /^Degradado/ }).click();
    await expect(page.locator("[data-date]").first()).toBeVisible();
    await expect(page.getByText("Iker").first()).toBeVisible();
  });
});
