import { test, expect } from "@playwright/test";

const PROGRESS_KEYS = [
  "sv_lesen_phase1_progress",
  "sv_lesen_phase2_progress",
  "sv_lesen_phase3_progress",
  "sv_lesen_phase4_progress",
];
const TOTALS: Record<string, number> = {
  sv_lesen_phase1_progress: 21,
  sv_lesen_phase2_progress: 15,
  sv_lesen_phase3_progress: 28,
  sv_lesen_phase4_progress: 17,
};

test.describe("Startseite – Fortschritt zurücksetzen", () => {
  test("Reset-Button löscht alle Progress-Keys + Tages-Streak", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate((keys) => {
      for (const k of keys) localStorage.setItem(k, JSON.stringify(["a", "b"]));
      localStorage.setItem("sv_lesen_daily", JSON.stringify({ last: "2026-01-01", count: 3 }));
    }, PROGRESS_KEYS);

    // confirm()-Dialog automatisch bestätigen
    page.on("dialog", (dialog) => dialog.accept());
    await page.locator("#dashReset").click();

    // Reload läuft asynchron – auf gelöschten Zustand pollen
    await expect
      .poll(() =>
        page.evaluate(() => {
          const keys = [
            "sv_lesen_phase1_progress",
            "sv_lesen_phase2_progress",
            "sv_lesen_phase3_progress",
            "sv_lesen_phase4_progress",
            "sv_lesen_daily",
          ];
          return keys.some((k) => localStorage.getItem(k) !== null);
        }),
      )
      .toBe(false);
  });
});

test.describe("Startseite – Gesamt-Zertifikat", () => {
  test("Zertifikat ist versteckt, solange nicht alle Phasen 100 % sind", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate((keys) => keys.forEach((k) => localStorage.removeItem(k)), PROGRESS_KEYS);
    await page.reload();
    await expect(page.locator("#cert")).toBeHidden();
  });

  test("Zertifikat erscheint, wenn alle 4 Phasen voll sind", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate((totals) => {
      for (const [key, total] of Object.entries(totals)) {
        const ids = Array.from({ length: total }, (_, i) => "x" + i);
        localStorage.setItem(key, JSON.stringify(ids));
      }
    }, TOTALS);
    await page.reload();
    await expect(page.locator("#cert")).toBeVisible();
  });
});

test.describe("Startseite – Tages-Streak-Anzeige", () => {
  test("Streak wird angezeigt, wenn count > 0", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() => {
      const d = new Date();
      const today =
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0");
      localStorage.setItem("sv_lesen_daily", JSON.stringify({ last: today, count: 5 }));
    });
    await page.reload();
    const streak = page.locator("#dashStreak");
    await expect(streak).toBeVisible();
    await expect(streak).toContainText("5");
  });

  test("Streak-Anzeige bleibt versteckt ohne Daten", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() => localStorage.removeItem("sv_lesen_daily"));
    await page.reload();
    await expect(page.locator("#dashStreak")).toBeHidden();
  });
});
