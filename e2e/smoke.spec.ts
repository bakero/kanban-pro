import { test, expect } from "@playwright/test";

test("home loads @regression", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Kanban Pro/i);
});