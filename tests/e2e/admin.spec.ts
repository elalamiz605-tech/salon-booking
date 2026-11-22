import { expect, test } from "@playwright/test";
import { adminLogin, openDayAhead } from "./helpers/admin";

test.describe.configure({ mode: "serial" });

const day = openDayAhead(8);

async function publicTimes(page: import("@playwright/test").Page, service: string, barber: string) {
  await page.goto("/en/book");
  await page.getByRole("button", { name: new RegExp(`^${service}`) }).click();
  await page.getByRole("button", { name: new RegExp(`^${barber}`) }).click();
  await page.locator(`[data-date="${day}"]`).click();
  await expect(page.locator("[data-slot]").first().or(page.getByText("No free times"))).toBeVisible();
  return (await page.locator("[data-slot]").allTextContents()).map((s) => s.trim());
}

test("phone booking, time off, conflicts, move and no-show", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "desktop", "admin flow runs once, on desktop");
  await adminLogin(page);

  // Phone booking for Iker at 12:00.
  await page.goto("/admin/new");
  await page.getByLabel("Service").selectOption("scissor-cut");
  await page.getByLabel("Barber").selectOption("iker");
  await page.getByLabel("Date", { exact: true }).fill(day);
  await page.getByLabel("Time", { exact: true }).fill("12:00");
  await page.getByLabel("Customer name").fill("Phone Customer");
  await page.getByLabel("Phone").fill("600111222");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { name: "Phone Customer" })).toBeVisible();

  await page.goto(`/admin?date=${day}`);
  await expect(page.getByText("Phone Customer")).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  expect(await publicTimes(visitor, "Scissor cut", "Iker")).not.toContain("12:00");

  // Whole-salon time off 15:00–17:00.
  await page.goto("/admin/blocks");
  await page.getByLabel("Who", { exact: true }).selectOption("");
  await page.getByLabel("Date", { exact: true }).fill(day);
  await page.getByLabel("From", { exact: true }).fill("15:00");
  await page.getByLabel("To", { exact: true }).fill("17:00");
  await page.getByLabel("Reason").fill("Training");
  await page.getByRole("button", { name: "Add time off" }).click();
  await expect(page.getByText("Training")).toBeVisible();
  const afterBlock = await publicTimes(visitor, "Scissor cut", "Álvaro");
  expect(afterBlock.filter((t) => t >= "14:20" && t < "17:00")).toEqual([]);
  expect(afterBlock).toContain("17:00");

  // Time off over the phone booking is refused with the list.
  await page.goto("/admin/blocks");
  await page.getByLabel("Who", { exact: true }).selectOption("iker");
  await page.getByLabel("Date", { exact: true }).fill(day);
  await page.getByLabel("From", { exact: true }).fill("12:00");
  await page.getByLabel("To", { exact: true }).fill("13:00");
  await page.getByRole("button", { name: "Add time off" }).click();
  await expect(page.getByText("These bookings are in that period:")).toBeVisible();
  await expect(page.getByText(/Phone Customer/)).toBeVisible();

  // Move to 13:00, then mark as no-show.
  await page.goto(`/admin?date=${day}`);
  await page.getByRole("link", { name: /Phone Customer/ }).click();
  await page.getByLabel("New date").fill(day);
  await page.getByLabel("New time").fill("13:00");
  await page.getByRole("button", { name: "Move booking" }).click();
  await expect(page.getByText(/13:00/).first()).toBeVisible();
  await page.getByRole("button", { name: "Mark as no-show" }).click();
  await expect(page.getByText("No-show", { exact: true }).first()).toBeVisible();

  await page.goto(`/admin?date=${day}`);
  await expect(page.getByRole("link", { name: /13:00.*Phone Customer/s })).toBeVisible();
});

test("week view shows counts", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "runs once");
  await adminLogin(page);
  await page.goto(`/admin/week?date=${day}`);
  await expect(page.getByRole("heading", { name: /Week of/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Iker" })).toBeVisible();
});
