# Welle 2 — Sammel-Farm (Belohnungs-Progression) — Ausführungsplan

> **Für agentische Worker:** REQUIRED SUB-SKILL: `superpowers:executing-plans`.
> Schritte nutzen Checkbox-Syntax (`- [ ]`). Arbeite auf einem Feature-Branch
> `feature/farm-welle-2`. **Nicht** nach `master` pushen/mergen — am Ende nur den
> Branch + die Commit-Liste + Testzahl berichten. Nach Abschluss: Update-Protokoll
> in `docs/masterplan.md` ausführen (Welle 2 auf ✅, Änderungs-Log, Learnings).

**Ziel:** Fortschritt schaltet Stardew-Farmtiere/-pflanzen frei, die auf
`index.html` als wachsende kleine Farm sichtbar sind.

**Architektur:** Neuer Baustein `shared/farm.js` (Katalog + Freischalt-Logik +
Render). Nur Emoji/CSS, **keine Bild-Assets**. `index.html` ruft `svFarmSync()`
mit der Gesamt-Aufgabenzahl auf, rendert das Gitter und feiert neue
Freischaltungen mit `svFinish()`.

**Tech-Stack:** Vanilla JS, `localStorage`, Playwright.

## Global Constraints

Es gelten alle „Globalen Constraints" aus `docs/masterplan.md`. Besonders:
- **Nach jeder Code-Änderung `node build.js` (Projekt-Root), BEVOR Tests laufen**
  — Playwright testet gegen `dist/`.
- Tests aus `tests/`: `npx playwright test [spec/datei.spec.ts]`.
- Neuen Shared-Block in `build.js` `includes`-Map eintragen; `// #INCLUDE`-Marker
  setzen.
- **Dark Mode:** neue Farbflächen brauchen einen Override in `shared/dark-mode.css`.
- **Mobile/A11y:** `prefers-reduced-motion` respektieren; `aria-label` an Kacheln;
  kein horizontaler Scroll.
- Alle Texte/Kommentare/Commits Deutsch. Volle Suite am Ende grün.

## Gelockte Design-Entscheidungen

- **Freischalt-Regel (deterministisch):** `target = min(Katalog, floor(totalDone / 4))`.
  `totalDone` = Summe der erledigten Aufgaben über alle Phasen (die Zahl, die das
  Eltern-Dashboard schon berechnet). 4 Aufgaben = 1 Farm-Objekt. (Bewusste
  Vereinfachung ggü. der Masterplan-Spec „5 gemeisterte SRS-Items" — schnelleres,
  sichtbares Feedback fürs Kind; im Änderungs-Log vermerken.)
- **Katalog (20 Objekte, feste Reihenfolge):** siehe `CATALOG` in Task 1.
- **Anzeige:** Immer das ganze Gitter zeigen; freigeschaltete Kacheln als Emoji,
  gesperrte als `❔` (gedimmt) — damit das Kind sieht, was es noch verdienen kann.
- **Feier:** Bei neu freigeschalteten Objekten `svFinish("Neu auf deiner Farm! 🎉")`,
  **einmal pro Sitzung** (`sessionStorage`-Flag `sv_farm_shown`).
- **Reset:** Der „Fortschritt zurücksetzen"-Button auf `index.html` löscht auch
  `sv_lesen_farm`.

## Datenmodell

`localStorage`-Key **`sv_lesen_farm`** = `{ "unlocked": ["huhn","karotte", …] }`
(Array freigeschalteter Katalog-Keys, in Katalog-Reihenfolge).

## Datei-Struktur

- Create: `shared/farm.js`, `tests/spec/farm.spec.ts`
- Modify: `build.js` (includes-Map), `index.html` (Include, Farm-Sektion, CSS,
  Sync/Render/Feier, Reset), `shared/dark-mode.css` (Override), `CLAUDE.md`,
  `docs/masterplan.md`.

---

### Task 1: Farm-Engine (`shared/farm.js`)

**Files:**
- Create: `shared/farm.js`
- Modify: `build.js` (includes-Map), `index.html` (Include-Marker als Testträger)
- Test: `tests/spec/farm.spec.ts`

**Interfaces — Produces (global):**
- `svFarmCatalog: {key,emoji,label}[]`
- `svFarmUnlocked(): string[]`
- `svFarmSync(score: number): string[]` — schaltet bis `floor(score/4)` frei,
  persistiert, gibt **neu** freigeschaltete Keys zurück.
- `svFarmRender(el: HTMLElement): void` — rendert alle Katalog-Kacheln.

- [ ] **Step 1: `shared/farm.js` schreiben**

```js
/* ===================================================================
   farm.js — Sammel-Farm: Fortschritt schaltet Stardew-Objekte frei.
   Nur Emoji/CSS. localStorage-Key sv_lesen_farm = { unlocked: [keys] }.
   Global: svFarmCatalog / svFarmUnlocked / svFarmSync / svFarmRender.
   =================================================================== */
(() => {
  if (window.__svFarmReady) return;
  window.__svFarmReady = true;

  const KEY = "sv_lesen_farm";
  const PER = 4; // erledigte Aufgaben pro Freischaltung

  const CATALOG = [
    { key: "huhn", emoji: "🐔", label: "Huhn" },
    { key: "karotte", emoji: "🥕", label: "Karotte" },
    { key: "kuh", emoji: "🐄", label: "Kuh" },
    { key: "sonnenblume", emoji: "🌻", label: "Sonnenblume" },
    { key: "schwein", emoji: "🐖", label: "Schwein" },
    { key: "mais", emoji: "🌽", label: "Mais" },
    { key: "schaf", emoji: "🐑", label: "Schaf" },
    { key: "erdbeere", emoji: "🍓", label: "Erdbeere" },
    { key: "hase", emoji: "🐰", label: "Hase" },
    { key: "weizen", emoji: "🌾", label: "Weizen" },
    { key: "ziege", emoji: "🐐", label: "Ziege" },
    { key: "traube", emoji: "🍇", label: "Traube" },
    { key: "hahn", emoji: "🐓", label: "Hahn" },
    { key: "kuerbis", emoji: "🎃", label: "Kürbis" },
    { key: "hund", emoji: "🐕", label: "Hund" },
    { key: "tomate", emoji: "🍅", label: "Tomate" },
    { key: "katze", emoji: "🐱", label: "Katze" },
    { key: "tulpe", emoji: "🌷", label: "Tulpe" },
    { key: "biene", emoji: "🐝", label: "Biene" },
    { key: "apfel", emoji: "🍎", label: "Apfel" },
  ];

  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || "{}");
      return Array.isArray(o.unlocked) ? o.unlocked : [];
    } catch (_) {
      return [];
    }
  }
  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ unlocked: list }));
    } catch (_) {}
  }

  function sync(score) {
    const target = Math.min(CATALOG.length, Math.floor((score || 0) / PER));
    const cur = load();
    if (target <= cur.length) return [];
    const neu = CATALOG.slice(cur.length, target).map((c) => c.key);
    save(cur.concat(neu));
    return neu;
  }

  function render(el) {
    if (!el) return;
    const set = new Set(load());
    el.replaceChildren();
    CATALOG.forEach((c) => {
      const tile = document.createElement("div");
      const on = set.has(c.key);
      tile.className = "farm-tile" + (on ? " on" : "");
      tile.textContent = on ? c.emoji : "❔";
      tile.setAttribute(
        "aria-label",
        on ? c.label + " freigeschaltet" : "noch nicht freigeschaltet",
      );
      el.appendChild(tile);
    });
  }

  window.svFarmCatalog = CATALOG;
  window.svFarmUnlocked = load;
  window.svFarmSync = sync;
  window.svFarmRender = render;
})();
```

- [ ] **Step 2: In `build.js` registrieren** (nach der `srs.js`-Zeile)

```js
  "shared/srs.js": loadShared("srs.js"),
  "shared/farm.js": loadShared("farm.js"),
```

- [ ] **Step 3: Marker in `index.html`** — im Script-Block nach dem srs-Include

```html
    <script>
      // #INCLUDE shared/srs.js
    </script>
    <script>
      // #INCLUDE shared/farm.js
    </script>
```

- [ ] **Step 4: Test schreiben** — `tests/spec/farm.spec.ts`

```ts
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
```

- [ ] **Step 5: Bauen + Test**

Run: `node build.js` · `npx playwright test spec/farm.spec.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/farm.js build.js index.html tests/spec/farm.spec.ts
git commit -m "✨ Farm: Sammel-Farm-Engine (shared/farm.js) + Tests"
```

---

### Task 2: `index.html` — Farm-Sektion, Render, Feier, Reset

**Files:**
- Modify: `index.html` (HTML-Sektion, CSS, Logik im Block „Tages-Streak, Reset &
  Gesamt-Zertifikat"), `shared/dark-mode.css`.
- Test: `tests/spec/farm.spec.ts` (Render-/Reset-Block)

- [ ] **Step 1: Render-/Reset-Test anhängen** an `tests/spec/farm.spec.ts`

```ts
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
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `node build.js` · `npx playwright test spec/farm.spec.ts -g "Anzeige"`
Expected: FAIL — `#farmGrid` existiert nicht.

- [ ] **Step 3: Farm-Sektion ins HTML** — in `index.html` direkt **nach** dem
      `</div>`-Ende des Eltern-Dashboards (`<div class="dashboard" …>`) und vor
      dem Zertifikat-Block einfügen:

```html
    <!-- ===== SAMMEL-FARM ===== -->
    <div class="farm" id="farm">
      <h3>🌱 Deine Farm</h3>
      <div class="farm-grid" id="farmGrid"></div>
      <div class="farm-hint">Für jede Übung wächst deine Farm! 🌻</div>
    </div>
```

- [ ] **Step 4: CSS** — vor dem `/* #INCLUDE shared/dark-mode.css */`-Marker in
      `index.html` einfügen:

```css
      .farm {
        max-width: 640px;
        margin: 24px auto 0;
        padding: 18px 16px;
        background: #f5eedc;
        border: 3px solid #d7c9a8;
        border-radius: 16px;
        text-align: center;
      }
      .farm h3 {
        font-family: "Press Start 2P", cursive;
        font-size: 0.8rem;
        color: #5da03c;
        margin: 0 0 12px;
      }
      .farm-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
        gap: 8px;
      }
      .farm-tile {
        aspect-ratio: 1;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        background: #fffaf0;
        border: 2px solid #e2d6b8;
        border-radius: 10px;
      }
      .farm-tile:not(.on) {
        opacity: 0.35;
        filter: grayscale(1);
      }
      .farm-tile.on {
        border-color: #7ec850;
        background: #eef7e3;
      }
      .farm-hint {
        margin-top: 12px;
        font-weight: 700;
        color: #8b6914;
        font-size: 0.85rem;
      }
```

- [ ] **Step 5: Dark-Mode-Override** — vor der letzten `}` (Ende des
      `@media (prefers-color-scheme: dark)`-Blocks) in `shared/dark-mode.css`:

```css
  .farm {
    background: #252540;
    border-color: #6b5a3e;
  }
  .farm h3 {
    color: #6a9a50;
  }
  .farm-tile {
    background: #1e1e34;
    border-color: #4a4a5e;
  }
  .farm-tile.on {
    background: #24361f;
    border-color: #3a6628;
  }
  .farm-hint {
    color: #8b7030;
  }
```

- [ ] **Step 6: Sync/Render/Feier-Logik** — im Script-Block „Tages-Streak, Reset &
      Gesamt-Zertifikat" (der nach den Includes läuft), **nach** dem SRS-Block und
      **vor** dem Reset-Block einfügen:

```js
        // Sammel-Farm: freischalten, rendern, neue Objekte feiern
        try {
          if (typeof svFarmSync === "function") {
            const totalDone = phases.reduce(
              (s, p) => (p.soon ? s : s + loadCount(p.progressKey)),
              0,
            );
            const neu = svFarmSync(totalDone);
            svFarmRender(document.getElementById("farmGrid"));
            if (
              neu.length > 0 &&
              typeof svFinish === "function" &&
              !sessionStorage.getItem("sv_farm_shown")
            ) {
              sessionStorage.setItem("sv_farm_shown", "1");
              setTimeout(() => svFinish("Neu auf deiner Farm! 🎉"), 600);
            }
          }
        } catch (e) {}
```

- [ ] **Step 7: Reset erweitern** — im Reset-Handler, bei den `removeItem`-Aufrufen:

```js
            localStorage.removeItem("sv_lesen_daily");
            localStorage.removeItem("sv_lesen_srs");
            localStorage.removeItem("sv_lesen_farm");
            location.reload();
```

- [ ] **Step 8: Bauen + volle Suite**

Run: `node build.js` · `npx playwright test` → alle grün (inkl. neuer Farm-Tests;
bestehende Reset-/A11y-/Responsive-Tests bleiben grün).

- [ ] **Step 9: Commit**

```bash
git add index.html shared/dark-mode.css tests/spec/farm.spec.ts
git commit -m "✨ Farm: Anzeige auf der Startseite, Freischalt-Feier & Reset"
```

---

### Task 3: Dokumentation + Masterplan-Update

**Files:**
- Modify: `CLAUDE.md` (localStorage-Keys + shared-Bausteine), `docs/masterplan.md`.

- [ ] **Step 1: `CLAUDE.md`**

Bei den phasenübergreifenden Keys ergänzen: `sv_lesen_farm` (Sammel-Farm,
`{unlocked:[keys]}`, von `shared/farm.js` gepflegt). Bei „Geteilte Bausteine"
`shared/farm.js` (Sammel-Farm) ergänzen.

- [ ] **Step 2: `docs/masterplan.md`** — Update-Protokoll: Welle 2 Status `✅`
      (Tabelle + Überschrift), Änderungs-Log-Zeile, Learnings (Freischalt-Regel
      `floor(totalDone/4)` statt „5 gemeisterte SRS-Items"; neuer Key
      `sv_lesen_farm`; Reset räumt Farm).

- [ ] **Step 3: Volle Suite ein letztes Mal**

Run: `node build.js` · `npx playwright test` → alle grün.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/masterplan.md
git commit -m "📝 Farm: Doku & Masterplan aktualisiert (Welle 2 fertig)"
```

---

## Self-Review

- **Spec-Abdeckung:** Datenmodell + Engine (Task 1), Anzeige/Feier/Reset (Task 2),
  Doku (Task 3). ✓
- **Design gelockt:** Freischalt-Regel, Katalog, Anzeige, Feier, Reset stehen oben.
- **Typkonsistenz:** `svFarmCatalog/Unlocked/Sync/Render`, Key `sv_lesen_farm`,
  Klassen `.farm/.farm-grid/.farm-tile(.on)`, IDs `#farm/#farmGrid` durchgängig.
- **Build-Reihenfolge:** jeder Test-Schritt nennt `node build.js` vor `npx playwright test`.
- **Nicht nach master pushen/mergen** — nur Branch + Ergebnis berichten.
