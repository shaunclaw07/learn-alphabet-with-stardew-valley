import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("Startseite → Phase 1 → zurück zur Übersicht", async ({ page }) => {
    await page.goto("/index.html");
    await page.locator('a[href*="phase1"]').first().click();
    await expect(page.locator("h1").first()).toBeVisible();

    // Zurück zur Übersicht
    await page.locator('a[href*="index.html"]').first().click();
    await expect(page).toHaveTitle(/Lesen lernen mit Stardew Valley/);
  });

  test("Alle Phasen sind via index.html erreichbar", async ({ page }) => {
    await page.goto("/index.html");

    for (const phase of ["phase1", "phase2", "phase3", "phase4"]) {
      const link = page.locator(`a[href*="${phase}"]`).first();
      await expect(link).toBeVisible();
      await link.click();
      // Wieder zur Startseite zurück
      await page.locator('a[href*="index.html"]').first().click();
    }
  });

  test("Phasen-Seiten laden ohne Fehler (HTTP 200)", async ({ page }) => {
    const urls = [
      "/index.html",
      "/phase1/lese-schule.html",
      "/phase2/phase2-schule.html",
      "/phase3/phase3-schule.html",
      "/phase4/phase4-schule.html",
    ];
    for (const url of urls) {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
    }
  });
});

test.describe("Druckversionen", () => {
  test("Druckversionen aller Phasen sind erreichbar", async ({ page }) => {
    const urls = [
      "/phase1/phase1-druckversion.html",
      "/phase2/phase2-druckversion.html",
      "/phase3/phase3-druckversion.html",
      "/phase4/phase4-druckversion.html",
    ];
    for (const url of urls) {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
    }
  });
});
