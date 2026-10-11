import { test, expect } from "@playwright/test";

const PHASE = "/phase1/lese-schule.html";

test.describe("Einstellungen – Vorlesen", () => {
  test("die Stimme ist fest eingebaut (kein Stimmen-Dropdown, kein Tempo-Slider)", async ({ page }) => {
    await page.goto(PHASE);
    await expect(page.locator("#voicePick")).toHaveCount(0);
    await expect(page.locator("#svRateSlider")).toHaveCount(0);
    await expect(page.locator(".voice-info")).toBeVisible();
  });
});

test.describe("Einstellungen – Lesbarkeit", () => {
  test("data-svfont ist ohne Speicherung 'normal'", async ({ page }) => {
    await page.goto(PHASE);
    await page.evaluate(() => localStorage.removeItem("sv_lesen_font"));
    await page.reload();
    const attr = await page.evaluate(() =>
      document.documentElement.getAttribute("data-svfont"),
    );
    expect(attr).toBe("normal");
  });

  test("Lesbar-Modus setzt Attribut + ändert Body-Abstand", async ({ page }) => {
    await page.goto(PHASE);
    const normal = await page.evaluate(
      () => getComputedStyle(document.body).letterSpacing,
    );
    await page.evaluate(() => localStorage.setItem("sv_lesen_font", "lesbar"));
    await page.reload();
    const attr = await page.evaluate(() =>
      document.documentElement.getAttribute("data-svfont"),
    );
    const lesbar = await page.evaluate(
      () => getComputedStyle(document.body).letterSpacing,
    );
    expect(attr).toBe("lesbar");
    expect(lesbar).not.toBe(normal);
  });
});

test.describe("Einstellungen – Bedienelemente", () => {
  test("Schrift-Umschalter aktiviert den Lesbar-Modus", async ({ page }) => {
    await page.goto(PHASE);
    await page.evaluate(() => localStorage.removeItem("sv_lesen_font"));
    await page.reload();
    const btn = page.locator("#svFontToggle");
    await expect(btn).toBeVisible();
    await btn.click();
    expect(await page.evaluate(() => localStorage.getItem("sv_lesen_font"))).toBe("lesbar");
    expect(
      await page.evaluate(() => document.documentElement.getAttribute("data-svfont")),
    ).toBe("lesbar");
    await expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});
