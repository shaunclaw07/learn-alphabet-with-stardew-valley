# Welle 4 — Buchstaben-Tracing (Schreiben) — Ausführungsplan

> **Für agentische Worker:** REQUIRED SUB-SKILL: `superpowers:executing-plans`.
> Schritte nutzen Checkbox-Syntax (`- [ ]`). Arbeite auf einem Feature-Branch
> `feature/tracing-welle-4`. **Nicht** nach `master` pushen/mergen — am Ende nur
> Branch + Commit-Liste + Testzahl berichten. Nach Abschluss: Update-Protokoll in
> `docs/masterplan.md` ausführen (Welle 4 auf ✅, Änderungs-Log, Learnings).

**Ziel:** Neuer Übungstyp in Phase 1 — Buchstaben mit Finger/Maus nachspuren.
Der Buchstabe erscheint als blasse Vorlage; das Kind malt drüber; „fertig", wenn
genug der Buchstabenform bedeckt ist.

**Architektur:** Neuer Baustein `shared/trace.js` (Canvas + Abdeckungs-Logik über
den **Font-Glyph**, keine handgezeichneten Pfade). Phase 1 bekommt einen
Trace-Bereich analog zur „Lese-Werkstatt". Abschluss meldet ans SRS aus Welle 1
via `svCorrect("p1:trace:" + id)`.

**Tech-Stack:** Vanilla JS, Canvas 2D, Pointer Events, Playwright.

## Global Constraints

Alle „Globalen Constraints" aus `docs/masterplan.md`. Besonders:
- **Nach jeder Code-Änderung `node build.js` (Root), BEVOR Tests laufen** —
  Playwright testet gegen `dist/`.
- **Frisches Test-Setup:** im Worktree ist `tests/node_modules` leer — einmalig
  `cd tests && npm ci && npx playwright install chromium`. Immer `npx playwright test`.
- Neuen Shared-Block in `build.js` `includes`-Map eintragen; `// #INCLUDE`-Marker.
- **Dark Mode:** neue Flächen → Override in `shared/dark-mode.css`.
- **Mobile/A11y:** Canvas responsiv (kein horizontaler Scroll bei 320/375px),
  `touch-action: none` auf dem Canvas (sonst scrollt die Seite beim Malen);
  Buttons ≥44px, `:focus-visible`, `prefers-reduced-motion` respektieren.
- Alle Texte/Kommentare/Commits Deutsch. Volle Suite am Ende grün.

## Gelockte Design-Entscheidungen

- **Mechanik: Font-Glyph + Abdeckung.** Der Zielbuchstabe wird in ein kleines
  Offscreen-Raster (`GRID = 24`) gerendert; alle Rasterzellen, die der Glyph
  bedeckt, sind **Zielzellen**. Beim Malen werden getroffene Zellen als bedeckt
  markiert. Ist `bedeckte Zielzellen / Zielzellen ≥ THRESHOLD (0.55)`, gilt der
  Buchstabe als nachgespurt.
- **Gilt automatisch für alle 21 Phase-1-Buchstaben** (nutzt die Schrift; keine
  Pfad-Daten pro Buchstabe).
- **SRS-Kopplung:** Abschluss ruft `svCorrect("p1:trace:" + id)` (Item-ID-Schema
  aus Welle 1). Kein neuer `localStorage`-Key.
- **Zugang:** neuer Nav-Button „✏️ Schreib-Werkstatt" in Phase 1, analog zur
  „🔨 Lese-Werkstatt" (erscheint wie diese ab 5 gelernten Buchstaben).
- **Testbare API** (echter Code-Pfad, kein Test-Hack): `window.svTrace` mit
  `start/markAt/coverage/reset` + Introspektion `_cells()/_done()`. Die
  Pointer-Handler rufen intern `svTrace.markAt(x,y)`.

## Datei-Struktur

- Create: `shared/trace.js`, `tests/spec/trace.spec.ts`
- Modify: `build.js` (includes-Map), `phase1/lese-schule.html` (Include, Nav-Button,
  Trace-Sektion, CSS, Pointer-Wiring), `shared/dark-mode.css`, `CLAUDE.md`,
  `docs/masterplan.md`.

---

### Task 1: Trace-Engine (`shared/trace.js`)

**Files:**
- Create: `shared/trace.js`
- Modify: `build.js`, `phase1/lese-schule.html` (Include-Marker als Testträger)
- Test: `tests/spec/trace.spec.ts`

**Interfaces — Produces (global `window.svTrace`):**
- `start(id: string, letter: string, canvas: HTMLCanvasElement, onDone?: (id)=>void)`
- `markAt(x: number, y: number)` — Punkt in CSS-Pixeln (0..Canvas-Breite) abdecken.
- `coverage(): number` — Anteil bedeckter Zielzellen (0..1).
- `reset(): void`
- `_cells(): number`, `_done(): boolean` — Introspektion für Tests.

- [ ] **Step 1: `shared/trace.js` schreiben**

```js
/* ===================================================================
   trace.js — Buchstaben nachspuren (Font-Glyph + Abdeckung).
   Global: window.svTrace = { start, markAt, coverage, reset, _cells, _done }.
   Abschluss meldet ans SRS: svCorrect("p1:trace:" + id).
   =================================================================== */
(() => {
  if (window.__svTraceReady) return;
  window.__svTraceReady = true;

  const GRID = 24; // Rasterauflösung für die Abdeckung
  const THRESHOLD = 0.55; // nötiger Anteil bedeckter Buchstaben-Zellen
  const BRUSH = 1; // zusätzlicher Zell-Radius je Malpunkt

  let cv = null;
  let ctx = null;
  let cssSize = 0;
  let targetCells = [];
  let coveredSet = null;
  let curId = null;
  let curChar = null;
  let done = false;
  let onDone = null;

  function buildTargetCells(letter) {
    const off = document.createElement("canvas");
    off.width = GRID;
    off.height = GRID;
    const o = off.getContext("2d");
    o.clearRect(0, 0, GRID, GRID);
    o.fillStyle = "#000";
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.font =
      "800 " + Math.floor(GRID * 0.82) + 'px "Nunito", system-ui, sans-serif';
    o.fillText(letter, GRID / 2, GRID / 2 + GRID * 0.06);
    const d = o.getImageData(0, 0, GRID, GRID).data;
    const cells = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (d[(y * GRID + x) * 4 + 3] > 40) cells.push({ gx: x, gy: y });
      }
    }
    return cells;
  }

  function drawGuide() {
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.save();
    ctx.fillStyle = "rgba(122,168,80,0.18)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      "800 " +
      Math.floor(cssSize * 0.82) +
      'px "Nunito", system-ui, sans-serif';
    ctx.fillText(curChar, cssSize / 2, cssSize / 2 + cssSize * 0.06);
    ctx.restore();
  }

  function coverage() {
    if (!targetCells.length) return 0;
    let hit = 0;
    for (const c of targetCells) {
      if (coveredSet.has(c.gx + "," + c.gy)) hit++;
    }
    return hit / targetCells.length;
  }

  function markAt(x, y) {
    if (done || !cv || !cssSize) return;
    const gx = Math.floor((x / cssSize) * GRID);
    const gy = Math.floor((y / cssSize) * GRID);
    for (let dy = -BRUSH; dy <= BRUSH; dy++) {
      for (let dx = -BRUSH; dx <= BRUSH; dx++) {
        coveredSet.add(gx + dx + "," + (gy + dy));
      }
    }
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.arc(x, y, cssSize * 0.045, 0, Math.PI * 2);
    ctx.fill();
    if (coverage() >= THRESHOLD) complete();
  }

  function complete() {
    if (done) return;
    done = true;
    if (curId && window.svCorrect) window.svCorrect("p1:trace:" + curId);
    if (typeof onDone === "function") onDone(curId);
  }

  function start(id, letter, canvas, doneCb) {
    cv = canvas;
    ctx = cv.getContext("2d");
    onDone = doneCb || null;
    curId = id;
    curChar = String(letter);
    done = false;
    coveredSet = new Set();
    targetCells = buildTargetCells(curChar);
    const rect = cv.getBoundingClientRect();
    cssSize = Math.max(1, Math.round(rect.width));
    const dpr = window.devicePixelRatio || 1;
    cv.width = cssSize * dpr;
    cv.height = cssSize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGuide();
  }

  function reset() {
    if (!cv) return;
    coveredSet = new Set();
    done = false;
    drawGuide();
  }

  window.svTrace = {
    start,
    markAt,
    coverage,
    reset,
    _cells: () => targetCells.length,
    _done: () => done,
  };
})();
```

- [ ] **Step 2: In `build.js` registrieren** (nach der `farm.js`-Zeile)

```js
  "shared/farm.js": loadShared("farm.js"),
  "shared/trace.js": loadShared("trace.js"),
```

- [ ] **Step 3: Marker in Phase 1** (nach dem `srs.js`-Include)

```js
      // #INCLUDE shared/srs.js

      // #INCLUDE shared/trace.js
```

- [ ] **Step 4: Test schreiben** — `tests/spec/trace.spec.ts`

```ts
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
```

- [ ] **Step 5: Bauen + Test**

Run: `node build.js` · `npx playwright test spec/trace.spec.ts` → PASS.
(Hinweis: In headless Chromium ist ggf. keine „Nunito"-Webschrift geladen — der
Fallback-Sans-Serif liefert trotzdem einen Buchstaben-Glyph; die Zielzellen-Zahl
ist > 0 und die Abdeckungslogik funktioniert unabhängig von der konkreten Schrift.)

- [ ] **Step 6: Commit**

```bash
git add shared/trace.js build.js phase1/lese-schule.html tests/spec/trace.spec.ts
git commit -m "✨ Trace: Buchstaben-Tracing-Engine (shared/trace.js) + Tests"
```

---

### Task 2: Phase-1-UI — Schreib-Werkstatt

Baue eine Trace-Sektion analog zur bestehenden **Lese-Werkstatt** in
`phase1/lese-schule.html`. Orientiere dich an deren Muster (Nav-Button in `render`
ab `completed.size >= 5`, versteckte `.main-wrap`-Sektion, Weiter/Nochmal-Buttons).

**Files:**
- Modify: `phase1/lese-schule.html`, `shared/dark-mode.css`
- Test: `tests/spec/trace.spec.ts` (UI-Block)

- [ ] **Step 1: UI-Test anhängen** an `tests/spec/trace.spec.ts`

```ts
test.describe("Schreib-Werkstatt – Phase 1 UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    // 5 gelernte Buchstaben freischalten (wie bei der Lese-Werkstatt)
    await page.evaluate(() =>
      localStorage.setItem(
        "sv_lesen_phase1_progress",
        JSON.stringify(["A", "E", "I", "O", "U"]),
      ),
    );
    await page.reload();
  });

  test("Nav-Button öffnet die Schreib-Werkstatt mit Canvas", async ({ page }) => {
    const nav = page.locator("#traceNavBtn");
    await expect(nav).toBeVisible();
    await nav.click();
    await expect(page.locator("#traceCanvas")).toBeVisible();
  });

  test("kein horizontaler Scroll bei 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.locator("#traceNavBtn").click();
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= window.innerWidth + 5;
    });
    expect(overflow).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `node build.js` · `npx playwright test spec/trace.spec.ts -g "Schreib-Werkstatt"`
Expected: FAIL — `#traceNavBtn`/`#traceCanvas` fehlen.

- [ ] **Step 3: Trace-Sektion ins HTML** — analog zur `#workshopWrap`-Sektion in
      `phase1/lese-schule.html` eine neue `.main-wrap`-Sektion einfügen:

```html
    <!-- ===== SCHREIB-WERKSTATT (TRACING) ===== -->
    <div class="main-wrap" id="traceWrap" style="display: none">
      <div class="workshop">
        <h2>✏️ Schreib-Werkstatt</h2>
        <div class="ws-subtitle">
          Fahr den Buchstaben mit dem Finger nach!
        </div>
        <div class="trace-letter" id="traceLetter"></div>
        <canvas
          id="traceCanvas"
          class="trace-canvas"
          aria-label="Buchstaben nachspuren"
        ></canvas>
        <div class="ws-hint" id="traceHint">Tippe und ziehe über den Buchstaben.</div>
        <div class="trace-controls">
          <button class="ws-btn" id="traceClearBtn" type="button">↺ Nochmal</button>
          <button class="ws-btn nextw" id="traceNextBtn" type="button">▶ Weiter</button>
        </div>
      </div>
    </div>
```

- [ ] **Step 4: CSS** — im `<style>` von `phase1/lese-schule.html` (vor dem
      dark-mode-Include) ergänzen:

```css
      .trace-letter {
        font-family: "Nunito", sans-serif;
        font-weight: 800;
        font-size: 2rem;
        color: #5da03c;
        margin-bottom: 8px;
      }
      .trace-canvas {
        display: block;
        width: min(88vw, 320px);
        aspect-ratio: 1;
        max-width: 100%;
        margin: 0 auto;
        background: #fffaf0;
        border: 3px solid #d7c9a8;
        border-radius: 16px;
        touch-action: none; /* WICHTIG: sonst scrollt die Seite beim Malen */
      }
      .trace-controls {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 14px;
      }
```

- [ ] **Step 5: Dark-Mode-Override** — vor der letzten `}` in `shared/dark-mode.css`:

```css
  /* Schreib-Werkstatt (Tracing) */
  .trace-letter {
    color: #6a9a50;
  }
  .trace-canvas {
    background: #2d2d44;
    border-color: #8b7030;
  }
```

- [ ] **Step 6: Nav-Button + Logik** — in der `render`-Erweiterung, wo schon der
      `wsNavBtn` (Lese-Werkstatt) ab `completed.size >= 5` erzeugt wird, analog
      einen `traceNavBtn` (✏️) hinzufügen, der `startTrace()` aufruft. Darunter die
      Trace-Steuerung (nutzt `window.svTrace` aus Task 1):

```js
      // ===== SCHREIB-WERKSTATT (TRACING) =====
      let traceDeck = [];
      let traceIdx = 0;

      function startTrace() {
        // nur bereits gelernte Buchstaben üben
        traceDeck = letters.filter((l) => completed.has(l.id));
        if (traceDeck.length === 0) traceDeck = [...letters];
        traceIdx = 0;
        document.getElementById("traceWrap").style.display = "block";
        renderTrace();
        document
          .getElementById("traceWrap")
          .scrollIntoView({ behavior: "smooth" });
      }

      function renderTrace() {
        const l = traceDeck[traceIdx];
        document.getElementById("traceLetter").textContent = l.id;
        document.getElementById("traceHint").textContent =
          "Fahr das " + l.id + " nach!";
        const canvas = document.getElementById("traceCanvas");
        svTrace.start(l.id, l.id, canvas, () => {
          document.getElementById("traceHint").textContent =
            "🎉 Super nachgespurt!";
        });
      }

      // Pointer-Handling (Touch + Maus)
      (() => {
        const canvas = document.getElementById("traceCanvas");
        if (!canvas) return;
        let drawing = false;
        const pos = (e) => {
          const r = canvas.getBoundingClientRect();
          return { x: e.clientX - r.left, y: e.clientY - r.top };
        };
        canvas.addEventListener("pointerdown", (e) => {
          drawing = true;
          canvas.setPointerCapture(e.pointerId);
          const p = pos(e);
          svTrace.markAt(p.x, p.y);
        });
        canvas.addEventListener("pointermove", (e) => {
          if (!drawing) return;
          const p = pos(e);
          svTrace.markAt(p.x, p.y);
        });
        canvas.addEventListener("pointerup", () => (drawing = false));
        canvas.addEventListener("pointercancel", () => (drawing = false));
      })();

      function traceClear() {
        svTrace.reset();
        const l = traceDeck[traceIdx];
        document.getElementById("traceHint").textContent =
          "Fahr das " + l.id + " nach!";
      }

      function traceNext() {
        traceIdx = (traceIdx + 1) % traceDeck.length;
        renderTrace();
      }

      document.getElementById("traceClearBtn").addEventListener("click", traceClear);
      document.getElementById("traceNextBtn").addEventListener("click", traceNext);
```

> Hinweis: Den `traceNavBtn` genau wie den `wsNavBtn` erzeugen (gleiche Klasse
> `nav-btn special`, `addEventListener("click", startTrace)`), nur mit Emoji „✏️".
> Die Pointer-IIFE und die Button-Listener müssen NACH dem Einfügen der
> Trace-Sektion laufen (gleiche Reihenfolge wie beim Workshop-Code).

- [ ] **Step 7: Bauen + volle Suite**

Run: `node build.js` · `npx playwright test` → alle grün.

- [ ] **Step 8: Commit**

```bash
git add phase1/lese-schule.html shared/dark-mode.css tests/spec/trace.spec.ts
git commit -m "✨ Trace: Schreib-Werkstatt in Phase 1 (Canvas, Pointer, Nav)"
```

---

### Task 3: Dokumentation + Masterplan-Update

**Files:**
- Modify: `CLAUDE.md`, `docs/masterplan.md`.

- [ ] **Step 1: `CLAUDE.md`** — bei „Geteilte Bausteine" `shared/trace.js`
      (Buchstaben-Tracing) ergänzen; erwähnen, dass Phase 1 eine Schreib-Werkstatt
      hat, deren Abschluss `svCorrect("p1:trace:<id>")` ans SRS meldet (kein neuer Key).

- [ ] **Step 2: `docs/masterplan.md`** — Welle 4 Status `✅` (Tabelle + Überschrift
      + Task-Checkboxen), Änderungs-Log-Zeile, Learnings (Font-Glyph-Abdeckung mit
      `GRID=24`/`THRESHOLD=0.55`; testbare `window.svTrace`-API; `touch-action:none`
      auf dem Canvas Pflicht; SRS-Kopplung `p1:trace:`).

- [ ] **Step 3: Volle Suite ein letztes Mal**

Run: `node build.js` · `npx playwright test` → alle grün.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/masterplan.md
git commit -m "📝 Trace: Doku & Masterplan aktualisiert (Welle 4 fertig)"
```

---

## Self-Review

- **Spec-Abdeckung:** Engine + Abdeckungslogik (Task 1), Phase-1-UI mit
  Canvas/Pointer/Nav + Responsive (Task 2), Doku (Task 3). ✓
- **Design gelockt:** Font-Glyph-Abdeckung, `GRID`/`THRESHOLD`, SRS-Kopplung,
  Zugang analog Lese-Werkstatt, testbare `svTrace`-API.
- **Testbarkeit:** `svTrace.markAt` ist der echte Code-Pfad der Pointer-Handler —
  Tests treiben ihn deterministisch (kein Test-Only-Hack). UI-Tests prüfen
  Sichtbarkeit + kein horizontaler Scroll.
- **Typkonsistenz:** `svTrace.start/markAt/coverage/reset/_cells/_done`, IDs
  `#traceWrap/#traceCanvas/#traceNavBtn/#traceLetter/#traceHint/#traceClearBtn/#traceNextBtn`,
  Item-ID `p1:trace:<id>`.
- **Nicht nach master pushen/mergen** — nur Branch + Ergebnis berichten.
