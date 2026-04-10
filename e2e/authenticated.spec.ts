import { test, expect } from "@playwright/test";

const authStorage = process.env.E2E_AUTH_STORAGE;
const companyCode = process.env.E2E_COMPANY_CODE;

test.describe("authenticated flows", () => {
  test.skip(!authStorage || !companyCode, "E2E auth storage or company code not provided.");

  test.use({ storageState: authStorage });

  test("menu opens and shows profile/settings", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("topbar-menu-button").click();
    await expect(page.getByTestId("topbar-menu")).toBeVisible();
    await expect(page.getByTestId("topbar-menu-item-profile")).toBeVisible();
    await expect(page.getByTestId("topbar-menu-item-settings")).toBeVisible();
  });

  test("profile page renders", async ({ page }) => {
    await page.goto("/perfil");
    await expect(page.getByTestId("profile-page")).toBeVisible();
  });

  test("empresa page renders widgets", async ({ page }) => {
    await page.goto(`/empresa/${companyCode}`);
    await expect(page.getByTestId("empresa-page")).toBeVisible();
    await expect(page.getByTestId("empresa-widget-projects")).toBeVisible();
    await expect(page.getByTestId("empresa-widget-workspaces")).toBeVisible();
    await expect(page.getByTestId("empresa-widget-status")).toBeVisible();
    await expect(page.getByTestId("empresa-widget-objectives")).toBeVisible();
  });
});
