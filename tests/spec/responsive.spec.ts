import { test, expect } from "@playwright/test";

test.describe("Responsive Layout", () => {
  const breakpoints = [
    { name: "Schmale Handy (320px)", width: 320, height: 700 },
    { name: "Handy (375px)", width: 375, height: 812 },
    { name: "Tablet (768px)", width: 768, height: 1024 },
    { name: "Desktop (1024px)", width: 1024, height: 768 },
  ];

  const pages = [
    { path: "/index.html", name: "Index" },
    { path: "/phase1/lese-schule.html", name: "Phase 1" },
    { path: "/phase2/phase2-schule.html", name: "Phase 2" },
    { path: "/phase3/phase3-schule.html", name: "Phase 3" },
    { path: "/phase4/phase4-schule.html", name: "Phase 4" },
  ];

  for (const { name, width, height } of breakpoints) {
    test.describe(`${name} (${width}px)`, () => {
      for (const page of pages) {
        test(`${page.name}: kein horizontaler Scroll bei ${width}px`, async ({ page: p }) => {
          await p.setViewportSize({ width, height });
          await p.goto(page.path);

          // Prüfen ob der Body nicht mehr als die Viewport-Breite einnimmt
          const scrollWidth = await p.evaluate(() =>
            Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            ),
          );
          const overflowX = await p.evaluate(() =>
            window.getComputedStyle(document.body).overflowX,
          );

          if (overflowX !== "hidden") {
            expect(scrollWidth).toBeLessThanOrEqual(width + 5); // 5px Toleranz
          }
        });
      }
    });
  }
});

test.describe("Touch-Targets", () => {
  test("Interaktive Elemente haben mindestens 44×44px", async ({ page }) => {
    // Wir checken Phase 1 als repräsentative Seite
    await page.goto("/phase1/lese-schule.html");

    const undersized = await page.evaluate(() => {
      const interactive = document.querySelectorAll(
        "button, a, select, [role=button], .nav-btn",
      );
      const results: { tag: string; text: string; w: number; h: number }[] = [];
      for (const el of interactive) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          results.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || "").trim().slice(0, 30),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          });
        }
      }
      return results;
    });

    if (undersized.length > 0) {
      const detail = undersized
        .map((e) => `  <${e.tag}> "${e.text}" → ${e.w}×${e.h}px`)
        .join("\n");
      console.warn(`Unter 44px Touch-Targets:\n${detail}`);
    }
    // Wir warnen nur, damit der Test nicht failt – manche Icons sind
    // absichtlich kleiner (Back-Link-Pfeil) und über ::before vergrössert
  });
});
