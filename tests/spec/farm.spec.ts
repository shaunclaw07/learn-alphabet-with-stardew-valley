import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/index.html");
  await page.evaluate(() => localStorage.removeItem("sv_lesen_farm"));
});

test.describe("Farm-Engine – Freischalten", () => {
  test("floor(score/4) Objekte werden freigeschaltet", async ({ page }) => {
    const r = await page.evaluate(() => {
      const a = (window as any).svFarmSync(0);
      const b = (window as any).svFarmSync(4);
      const c = (window as any).svFarmSync(8);
      return { a, b, c, unlocked: (window as any).svFarmUnlocked() };
    });
    expect(r.a).toEqual([]);
    expect(r.b).toEqual(["huhn"]);
    expect(r.c).toEqual(["karotte"]);
    expect(r.unlocked.length).toBe(2);
  });

  test("ist idempotent (kein Doppel-Freischalten)", async ({ page }) => {
    const r = await page.evaluate(() => {
      (window as any).svFarmSync(8);
      return (window as any).svFarmSync(8);
    });
    expect(r).toEqual([]);
  });

  test("ist auf die Katalog-Länge gedeckelt", async ({ page }) => {
    const len = await page.evaluate(() => {
      (window as any).svFarmSync(100000);
      return (window as any).svFarmUnlocked().length;
    });
    const catLen = await page.evaluate(() => (window as any).svFarmCatalog.length);
    expect(len).toBe(catLen);
  });
});

test.describe("Farm – Anzeige & Reset auf der Startseite", () => {
  test("rendert alle Katalog-Kacheln, freigeschaltete mit Klasse 'on'", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() =>
      localStorage.setItem(
        "sv_lesen_farm",
        JSON.stringify({ unlocked: ["huhn", "karotte"] }),
      ),
    );
    await page.reload();
    const grid = page.locator("#farmGrid");
    await expect(grid).toBeVisible();
    const catLen = await page.evaluate(() => (window as any).svFarmCatalog.length);
    await expect(grid.locator(".farm-tile")).toHaveCount(catLen);
    await expect(grid.locator(".farm-tile.on")).toHaveCount(2);
  });

  test("Reset-Button löscht sv_lesen_farm", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() =>
      localStorage.setItem("sv_lesen_farm", JSON.stringify({ unlocked: ["huhn"] })),
    );
    page.on("dialog", (d) => d.accept());
    await page.locator("#dashReset").click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("sv_lesen_farm")))
      .toBeNull();
  });
});
