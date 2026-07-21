import { test, expect } from "@playwright/test";

// Läuft auf einer Seite, die shared/srs.js einbindet.
test.beforeEach(async ({ page }) => {
  await page.goto("/phase1/lese-schule.html");
  await page.evaluate(() => localStorage.removeItem("sv_lesen_srs"));
});

function todayStr(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

test.describe("SRS-Engine – Box-Logik", () => {
  test("richtig hebt die Box und setzt due in die Zukunft", async ({ page }) => {
    const rec = await page.evaluate(() => (window as any).svSrsRecord("p1:M", true));
    expect(rec.box).toBe(2);
    expect(rec.seen).toBe(1);
    expect(rec.correct).toBe(1);
    expect(rec.due > todayStr()).toBe(true); // Box 2 → +1 Tag
  });

  test("falsch setzt die Box auf 1 und due auf heute", async ({ page }) => {
    const rec = await page.evaluate(() => {
      (window as any).svSrsRecord("p1:M", true); // Box 2
      (window as any).svSrsRecord("p1:M", true); // Box 3
      return (window as any).svSrsRecord("p1:M", false); // zurück auf 1
    });
    expect(rec.box).toBe(1);
    expect(rec.due).toBe(todayStr());
  });

  test("Box ist bei 5 gedeckelt", async ({ page }) => {
    const box = await page.evaluate(() => {
      for (let i = 0; i < 10; i++) (window as any).svSrsRecord("p1:M", true);
      return (window as any).svSrsRecord("p1:M", true).box;
    });
    expect(box).toBe(5);
  });
});

test.describe("SRS-Engine – Fälligkeit & Sortierung", () => {
  test("svSrsDue liefert nur heute fällige Items, niedrigste Box zuerst", async ({ page }) => {
    const dueIds = await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({
          "p1:A": { box: 1, due: "2000-01-01", seen: 1, correct: 0 },
          "p1:B": { box: 3, due: "2000-01-01", seen: 3, correct: 3 },
          "p1:C": { box: 5, due: "2999-01-01", seen: 9, correct: 9 },
        }),
      );
      return (window as any).svSrsDue();
    });
    expect(dueIds).toEqual(["p1:A", "p1:B"]); // C ist nicht fällig
  });

  test("svSrsSortDueFirst stellt fällige Items nach vorne", async ({ page }) => {
    const order = await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({ "p1:C": { box: 1, due: "2000-01-01", seen: 1, correct: 0 } }),
      );
      const deck = [{ id: "A" }, { id: "B" }, { id: "C" }];
      return (window as any)
        .svSrsSortDueFirst(deck, (x: any) => "p1:" + x.id)
        .map((x: any) => x.id);
    });
    expect(order[0]).toBe("C"); // einziges fälliges Item zuerst
  });

  test("svSrsStats zählt gesamt/gemeistert/fällig", async ({ page }) => {
    const stats = await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({
          "p1:A": { box: 5, due: "2999-01-01", seen: 9, correct: 9 },
          "p1:B": { box: 1, due: "2000-01-01", seen: 1, correct: 0 },
        }),
      );
      return (window as any).svSrsStats();
    });
    expect(stats.total).toBe(2);
    expect(stats.mastered).toBe(1);
    expect(stats.due).toBe(1);
  });
});

test.describe("SRS – Kopplung an celebrate.js", () => {
  test("svCorrect(id) legt einen SRS-Datensatz an", async ({ page }) => {
    const rec = await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_srs");
      (window as any).svCorrect("p1:M");
      return JSON.parse(localStorage.getItem("sv_lesen_srs")!)["p1:M"];
    });
    expect(rec).toBeDefined();
    expect(rec.box).toBe(2);
  });

  test("svWrong(id) setzt die Box zurück auf 1", async ({ page }) => {
    const box = await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_srs");
      (window as any).svCorrect("p1:M"); // Box 2
      (window as any).svWrong("p1:M"); // zurück auf 1
      return JSON.parse(localStorage.getItem("sv_lesen_srs")!)["p1:M"].box;
    });
    expect(box).toBe(1);
  });

  test("svCorrect() ohne id legt keinen SRS-Datensatz an", async ({ page }) => {
    const srs = await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_srs");
      (window as any).svCorrect();
      return localStorage.getItem("sv_lesen_srs");
    });
    expect(srs === null || srs === "{}").toBe(true);
  });
});

test.describe("SRS – Anzeige auf der Startseite", () => {
  test("zeigt fällige Anzahl, wenn Items fällig sind", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({
          "p1:A": { box: 1, due: "2000-01-01", seen: 1, correct: 0 },
          "p1:B": { box: 2, due: "2000-01-01", seen: 2, correct: 1 },
        }),
      );
    });
    await page.reload();
    const el = page.locator("#dashSrs");
    await expect(el).toBeVisible();
    await expect(el).toContainText("2");
  });

  test("bleibt versteckt, wenn nichts fällig ist", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() => localStorage.removeItem("sv_lesen_srs"));
    await page.reload();
    await expect(page.locator("#dashSrs")).toBeHidden();
  });
});
