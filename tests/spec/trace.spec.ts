import { test, expect } from "@playwright/test";

test.describe("Trace-Engine – Abdeckung", () => {
  test("erzeugt Zielzellen aus dem Buchstaben", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    const cells = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.style.width = "240px";
      c.style.height = "240px";
      document.body.appendChild(c);
      (window as any).svTrace.start("M", "M", c);
      return (window as any).svTrace._cells();
    });
    expect(cells).toBeGreaterThan(0);
  });

  test("volle Abdeckung schließt ab und meldet ans SRS", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    const r = await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_srs");
      const c = document.createElement("canvas");
      c.style.width = "240px";
      c.style.height = "240px";
      document.body.appendChild(c);
      const sv = (window as any).svTrace;
      sv.start("M", "M", c);
      for (let y = 4; y < 240; y += 6)
        for (let x = 4; x < 240; x += 6) sv.markAt(x, y);
      return {
        coverage: sv.coverage(),
        done: sv._done(),
        srs: localStorage.getItem("sv_lesen_srs"),
      };
    });
    expect(r.coverage).toBeGreaterThanOrEqual(0.55);
    expect(r.done).toBe(true);
    expect(r.srs).toContain("p1:trace:M");
  });

  test("wenig Abdeckung schließt NICHT ab", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    const done = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.style.width = "240px";
      c.style.height = "240px";
      document.body.appendChild(c);
      const sv = (window as any).svTrace;
      sv.start("M", "M", c);
      sv.markAt(2, 2); // nur eine Ecke
      return sv._done();
    });
    expect(done).toBe(false);
  });
});
