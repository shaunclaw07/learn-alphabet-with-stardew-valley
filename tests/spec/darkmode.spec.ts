import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const DIST = resolve(PROJECT_ROOT, "dist");

// Seiten, die shared/dark-mode.css einbinden
const DARK_PAGES = [
  { path: "/index.html", file: "index.html", name: "Index" },
  { path: "/phase1/lese-schule.html", file: "phase1/lese-schule.html", name: "Phase 1" },
  { path: "/phase2/phase2-schule.html", file: "phase2/phase2-schule.html", name: "Phase 2" },
  { path: "/phase3/phase3-schule.html", file: "phase3/phase3-schule.html", name: "Phase 3" },
  { path: "/phase4/phase4-schule.html", file: "phase4/phase4-schule.html", name: "Phase 4" },
];

test.describe("Dark Mode – Source", () => {
  for (const { file, name } of DARK_PAGES) {
    test(`${name}: enthält prefers-color-scheme-Block`, () => {
      const html = readFileSync(resolve(DIST, file), "utf-8");
      expect(html).toContain("prefers-color-scheme: dark");
    });
  }
});

test.describe("Dark Mode – Rendering", () => {
  for (const { path, name } of DARK_PAGES) {
    test(`${name}: Body-Hintergrund unterscheidet sich in Dark vs. Light`, async ({
      page,
    }) => {
      await page.goto(path);

      await page.emulateMedia({ colorScheme: "light" });
      const bgLight = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );

      await page.emulateMedia({ colorScheme: "dark" });
      const bgDark = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );

      expect(bgDark).not.toBe(bgLight);
    });
  }

  test("Phase 1: Eltern-Hinweis-Box hat eigenen Dark-Override", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    const box = page.locator("details.eltern-hinweis");
    await expect(box).toBeVisible();

    await page.emulateMedia({ colorScheme: "light" });
    const light = await box.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    await page.emulateMedia({ colorScheme: "dark" });
    const dark = await box.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(dark).not.toBe(light);
  });
});
