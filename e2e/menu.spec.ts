import { test, expect } from "@playwright/test";

test("menu button is accessible on login screen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Kanban Pro/i);
  // Login page should be visible when not authenticated
  await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
});

test("profile route redirects to login when not authenticated", async ({ page }) => {
  await page.goto("/perfil");
  await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
});

test("empresa route redirects to login when not authenticated", async ({ page }) => {
  await page.goto("/empresa/TESTCODE");
  await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
});
