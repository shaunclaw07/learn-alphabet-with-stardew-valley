import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");

/** Finde alle HTML-Dateien im Projekt (ausser .git, node_modules) */
function findAllHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) results.push(...findAllHtmlFiles(full));
    else if (entry.name.endsWith(".html")) results.push(full);
  }
  return results;
}

test.describe("JS-Syntax aller inline Scripts", () => {
  const htmlFiles = findAllHtmlFiles(PROJECT_ROOT);

  for (const file of htmlFiles) {
    const rel = file.replace(PROJECT_ROOT + "/", "");
    test(`${rel} – alle <script>-Blöcke sind parsebar`, () => {
      const html = readFileSync(file, "utf-8");
      const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
      let match: RegExpExecArray | null;
      let i = 0;

      while ((match = scriptRegex.exec(html)) !== null) {
        const code = match[1].trim();
        if (!code) continue; // leeres Script ignorieren
        try {
          new Function(code);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(
            `${rel} – Script #${i} enthält Syntaxfehler:\n${msg}\n\n--- Code ---\n${code.slice(0, 500)}`,
          );
        }
        i++;
      }

      // Keine Script-Blöcke ist OK (z. B. Druckversionen ohne JS)
      if (i === 0) {
        return;
      }
    });
  }
});

test.describe("HTML-Struktur – Index", () => {
  test("index.html existiert und hat Titel", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page).toHaveTitle(/Lesen lernen mit Stardew Valley/);
  });

  test("index.html verlinkt auf alle 4 Phasen", async ({ page }) => {
    await page.goto("/index.html");
    // Wir suchen nach Links, die auf die Phasen-Dateien zeigen
    for (const phase of ["phase1", "phase2", "phase3", "phase4"]) {
      const link = page.locator(`a[href*="${phase}"]`).first();
      await expect(link).toBeVisible();
    }
  });
});

test.describe("HTML-Struktur – Phasen", () => {
  const phases = [
    { path: "/phase1/lese-schule.html", name: "Phase 1" },
    { path: "/phase2/phase2-schule.html", name: "Phase 2" },
    { path: "/phase3/phase3-schule.html", name: "Phase 3" },
    { path: "/phase4/phase4-schule.html", name: "Phase 4" },
  ];

  for (const phase of phases) {
    test.describe(phase.name, () => {
      test(`${phase.path} hat ← Übersicht Back-Link`, async ({ page }) => {
        await page.goto(phase.path);
        const backLink = page.locator('a[href*="index.html"]').first();
        await expect(backLink).toBeVisible();
      });

      test(`${phase.path} hat einen Voice-Picker`, async ({ page }) => {
        await page.goto(phase.path);
        const select = page.locator("select").first();
        await expect(select).toBeVisible();
      });

      test(`${phase.path} hat eine sichtbare Überschrift`, async ({ page }) => {
        await page.goto(phase.path);
        const heading = page.locator("h1").first();
        await expect(heading).toBeVisible();
      });
    });
  }
});
