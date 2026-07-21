import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");

// Alle Seiten, die shared/celebrate.js einbinden (Phasen + Startseite)
const CELEBRATE_PAGES = [
  { path: "/index.html", name: "Index" },
  { path: "/phase1/lese-schule.html", name: "Phase 1" },
  { path: "/phase2/phase2-schule.html", name: "Phase 2" },
  { path: "/phase3/phase3-schule.html", name: "Phase 3" },
  { path: "/phase4/phase4-schule.html", name: "Phase 4" },
];

const PHASE_SOURCES = [
  "phase1/lese-schule.html",
  "phase2/phase2-schule.html",
  "phase3/phase3-schule.html",
  "phase4/phase4-schule.html",
];

test.describe("Belohnungs-Feedback – globale API", () => {
  for (const { path, name } of CELEBRATE_PAGES) {
    test(`${name}: svCorrect/svFinish/svStreakReset/svRandomPraise existieren`, async ({
      page,
    }) => {
      await page.goto(path);
      const types = await page.evaluate(() => ({
        correct: typeof (window as any).svCorrect,
        finish: typeof (window as any).svFinish,
        reset: typeof (window as any).svStreakReset,
        praise: typeof (window as any).svRandomPraise,
      }));
      expect(types.correct).toBe("function");
      expect(types.finish).toBe("function");
      expect(types.reset).toBe("function");
      expect(types.praise).toBe("function");
    });
  }
});

test.describe("Belohnungs-Feedback – Ton-Aus-Button", () => {
  for (const { path, name } of CELEBRATE_PAGES) {
    test(`${name}: Mute-Button ist sichtbar, ≥44px und hat aria-label`, async ({
      page,
    }) => {
      await page.goto(path);
      const btn = page.locator("#sv-mute");
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute("aria-label", /.+/);
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });
  }

  test("Mute-Button schaltet sv_lesen_muted um", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    await page.evaluate(() => localStorage.removeItem("sv_lesen_muted"));
    const btn = page.locator("#sv-mute");
    await btn.click();
    expect(await page.evaluate(() => localStorage.getItem("sv_lesen_muted"))).toBe("1");
    await btn.click();
    expect(await page.evaluate(() => localStorage.getItem("sv_lesen_muted"))).toBe("0");
  });
});

test.describe("Belohnungs-Feedback – Tages-Streak", () => {
  test("svCorrect() zählt sv_lesen_daily hoch (heute)", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    const daily = await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_daily");
      (window as any).svCorrect();
      return localStorage.getItem("sv_lesen_daily");
    });
    expect(daily).not.toBeNull();
    const parsed = JSON.parse(daily!);
    expect(parsed.count).toBeGreaterThanOrEqual(1);
    expect(parsed.last).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("svCorrect() zählt am selben Tag nicht doppelt", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    const count = await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_daily");
      (window as any).svCorrect();
      (window as any).svCorrect();
      (window as any).svCorrect();
      return JSON.parse(localStorage.getItem("sv_lesen_daily")!).count;
    });
    expect(count).toBe(1);
  });
});

test.describe("Belohnungs-Feedback – Konfetti", () => {
  test("svFinish() vergrößert die Scroll-Breite nicht (Overlay clippt)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/phase1/lese-schule.html");

    const widthOf = () =>
      page.evaluate(() =>
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      );

    const before = await widthOf();
    // 42 Konfetti-Teile bis an den rechten Rand – dürfen keinen Scroll erzeugen
    await page.evaluate(() => (window as any).svFinish("Test"));
    const after = await widthOf();

    expect(after).toBeLessThanOrEqual(before);
  });
});

test.describe("Belohnungs-Feedback – Hooks im Source", () => {
  for (const rel of PHASE_SOURCES) {
    test(`${rel} ruft svCorrect() und svFinish() auf`, () => {
      const src = readFileSync(resolve(PROJECT_ROOT, rel), "utf-8");
      expect(src).toContain("svCorrect(");
      expect(src).toContain("svFinish(");
    });
  }
});
