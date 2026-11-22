import { expect, test } from "@playwright/test";
import { fillDetails, pickFirstSlot } from "./helpers/book";

test.describe("manage booking", () => {
  test("shows the booking and cancels it", async ({ page }) => {
    const { time, date } = await pickFirstSlot(page, { service: "Kids' cut", barber: "Iker" });
    await page.getByRole("button", { name: time, exact: true }).click();
    await fillDetails(page, "Lucas Gil", "lucas@example.com");
    await page.getByLabel(/I accept the/).check();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
    await expect(page.getByText("Kids' cut")).toBeVisible();
    await expect(page.getByText(time).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Add to calendar" })).toHaveAttribute("href", /\/ics$/);

    await page.getByRole("button", { name: "Cancel appointment" }).click();
    await page.getByRole("button", { name: "Yes, cancel it" }).click();
    await expect(page.getByRole("heading", { name: "Your appointment is cancelled" })).toBeVisible();

    await page.goto("/en/book");
    await page.getByRole("button", { name: /^Kids' cut/ }).click();
    await page.getByRole("button", { name: /^Iker/ }).click();
    await page.locator(`[data-date="${date}"]`).click();
    await expect(page.getByRole("button", { name: time, exact: true })).toBeVisible();
  });

  test("unknown link", async ({ page }) => {
    await page.goto("/en/booking/this-token-does-not-exist");
    await expect(page.getByRole("heading", { name: "We couldn't find this booking" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the home page" })).toBeVisible();
  });

  test("calendar file downloads", async ({ page, request }) => {
    const { time } = await pickFirstSlot(page, { service: "Grey blending", barber: "Álvaro" });
    await page.getByRole("button", { name: time, exact: true }).click();
    await fillDetails(page);
    await page.getByLabel(/I accept the/).check();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
    const res = await request.get(page.url() + "/ics");
    expect(res.headers()["content-type"]).toContain("text/calendar");
    expect(await res.text()).toContain("BEGIN:VEVENT");
  });
});
