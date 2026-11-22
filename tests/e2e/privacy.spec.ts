import { expect, test } from "@playwright/test";
import config from "../../salon.config";

test("privacy page is generated from the configuration", async ({ page }) => {
  await page.goto("/es/privacy");
  await expect(page.getByRole("heading", { name: "Política de privacidad", level: 1 })).toBeVisible();
  await expect(page.getByRole("main").getByText(config.legalName)).toBeVisible();
  await expect(page.getByText(`${config.retentionMonths} meses`)).toBeVisible();
});
