import { test, expect } from "@playwright/test";

const PHASE = "/phase1/lese-schule.html";

test.describe("Einstellungen – Tempo-Logik", () => {
  test("svUserRate ist ohne Speicherung 1", async ({ page }) => {
    await page.goto(PHASE);
    await page.evaluate(() => localStorage.removeItem("sv_lesen_rate"));
    await page.reload();
    expect(await page.evaluate(() => (window as any).svUserRate())).toBe(1);
  });

  test("gespeichertes Tempo wird übernommen", async ({ page }) => {
    await page.goto(PHASE);
    await page.evaluate(() => localStorage.setItem("sv_lesen_rate", "1.2"));
    await page.reload();
    expect(await page.evaluate(() => (window as any).svUserRate())).toBeCloseTo(1.2, 5);
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
  test("Tempo-Slider speichert und bleibt nach Reload erhalten", async ({ page }) => {
    await page.goto(PHASE);
    const slider = page.locator("#svRateSlider");
    await expect(slider).toBeVisible();
    await slider.fill("1.2");
    await slider.dispatchEvent("input");
    expect(await page.evaluate(() => localStorage.getItem("sv_lesen_rate"))).toBe("1.2");
    await page.reload();
    await expect(page.locator("#svRateSlider")).toHaveValue("1.2");
  });

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
