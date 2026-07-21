import { test, expect } from "@playwright/test";

// Eltern-Lernjournal auf index.html — liest sv_lesen_srs (Welle 1),
// keine neue Persistenz.
test.beforeEach(async ({ page }) => {
  await page.goto("/index.html");
  await page.evaluate(() => localStorage.removeItem("sv_lesen_srs"));
});

test.describe("Lernjournal – Meisterung", () => {
  test("zeigt gemeistert / gesamt aus svSrsStats()", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({
          "p1:A": { box: 5, due: "2999-01-01", seen: 9, correct: 9 },
          "p1:B": { box: 1, due: "2000-01-01", seen: 1, correct: 0 },
        }),
      );
    });
    await page.reload();
    const journal = page.locator("#dashJournal");
    await expect(journal).toBeVisible();
    const mastered = page.locator("#dashMastered");
    await expect(mastered).toBeVisible();
    await expect(mastered).toContainText("1");
    await expect(mastered).toContainText("2");
  });

  test("Leerzustand: Hinweis statt Zahlen, wenn keine SRS-Daten", async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("sv_lesen_srs"));
    await page.reload();
    await expect(page.locator("#dashJournalEmpty")).toBeVisible();
    await expect(page.locator("#dashMastered")).toBeHidden();
  });
});

test.describe("Lernjournal – Heute üben", () => {
  test("verlinkt auf die Phase mit den meisten fälligen Items", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({
          "p1:A": { box: 1, due: "2000-01-01", seen: 1, correct: 0 },
          "p2:X": { box: 1, due: "2000-01-01", seen: 1, correct: 0 },
          "p2:Y": { box: 2, due: "2000-01-01", seen: 2, correct: 1 },
        }),
      );
    });
    await page.reload();
    const practice = page.locator("#dashPractice");
    await expect(practice).toBeVisible();
    // Phase 2 hat 2 fällige Items, Phase 1 nur 1 → Link auf Phase 2
    await expect(practice).toHaveAttribute("href", /phase2/);
  });

  test("Heute-üben-Link bleibt verborgen, wenn nichts fällig ist", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({
          "p1:A": { box: 5, due: "2999-01-01", seen: 9, correct: 9 },
        }),
      );
    });
    await page.reload();
    await expect(page.locator("#dashPractice")).toBeHidden();
  });
});
