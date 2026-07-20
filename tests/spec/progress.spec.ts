import { test, expect } from "@playwright/test";

test.describe("Progress (localStorage)", () => {
  test.beforeEach(async ({ page }) => {
    // Sauberen Zustand herstellen
    await page.goto("/index.html");
    await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_phase1_progress");
      localStorage.removeItem("sv_lesen_voice");
    });
  });

  test("Phase 1: Lektion-Klick setzt localStorage-Eintrag", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");

    // Ersten "Klick wenn du diesen Buchstaben kannst!"-Button finden
    const doneBtn = page.locator("button", { hasText: "Klick wenn du" }).first();
    await expect(doneBtn).toBeVisible({ timeout: 5_000 });

    await doneBtn.click();

    // Prüfen ob ein progress-Eintrag existiert
    const progress = await page.evaluate(() =>
      localStorage.getItem("sv_lesen_phase1_progress"),
    );
    expect(progress).not.toBeNull();
    const saved = JSON.parse(progress!);
    expect(Array.isArray(saved)).toBe(true);
    expect(saved.length).toBeGreaterThanOrEqual(1);
  });

  test("Progress ist phasenübergreifend persistent", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    await page.evaluate(() => {
      localStorage.setItem("sv_lesen_phase1_progress", JSON.stringify(["a", "e"]));
    });

    // Seite neu laden – Progress muss erhalten bleiben
    await page.reload();
    const progress = await page.evaluate(() =>
      localStorage.getItem("sv_lesen_phase1_progress"),
    );
    expect(JSON.parse(progress!)).toEqual(["a", "e"]);
  });

  test("Voice-Präferenz wird gespeichert", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    await page.evaluate(() => {
      localStorage.setItem("sv_lesen_voice", "Google Deutsch");
    });

    await page.reload();
    const voice = await page.evaluate(() =>
      localStorage.getItem("sv_lesen_voice"),
    );
    expect(voice).toBe("Google Deutsch");
  });
});
