# Welle 5 — Tempo & Lesbarkeit — Ausführungsplan

> **Für agentische Worker:** REQUIRED SUB-SKILL: `superpowers:executing-plans`.
> Schritte nutzen Checkbox-Syntax (`- [ ]`). Arbeite auf einem Feature-Branch
> `feature/tempo-welle-5`. **Nicht** nach `master` pushen/mergen — am Ende nur
> Branch + Commit-Liste + Testzahl berichten. Nach Abschluss: Update-Protokoll in
> `docs/masterplan.md` ausführen (Welle 5 auf ✅, Änderungs-Log, Learnings).

**Ziel:** Zwei Einstellungen, phasenübergreifend gespeichert und im Vorlese-
Bereich bedienbar: (1) **Sprech-Tempo** (Slider) und (2) **Lesbarkeit** (größere
Schrift + mehr Abstand, Umschalter).

**Architektur:** Erweiterung des geteilten `shared/voice-picker.js` (Tempo-
Multiplikator in `speak()`, Anwenden des Schrift-Modus, injizierte Bedien-
elemente) + Regeln in `shared/base.css`. Kein neuer Shared-Baustein.

**Tech-Stack:** Vanilla JS, `localStorage`, Web Speech API, Playwright.

## Global Constraints

Alle „Globalen Constraints" aus `docs/masterplan.md`. Besonders:
- **Nach jeder Code-Änderung `node build.js` (Root), BEVOR Tests laufen.**
- **Frisches Test-Setup:** `cd tests && npm ci && npx playwright install chromium`;
  immer `npx playwright test`.
- **Voice-Engine nicht brechen:** `isGermanVoice`/`refreshVoices`/`speak`/
  `showNoVoices` + Init-Polling bleiben funktional unverändert; nur das Tempo
  wird in `speak()` skaliert.
- **Mobile/A11y:** neue Bedienelemente ≥44px, `aria-label`/`aria-pressed`,
  `:focus-visible`; kein horizontaler Scroll.
- **Dark Mode:** neue Flächen → Override in `shared/dark-mode.css`.
- Alle Texte/Kommentare/Commits Deutsch. Volle Suite am Ende grün.

## Gelockte Design-Entscheidungen

- **Tempo = Multiplikator.** `speak(text, rate)` skaliert den bisherigen
  Basiswert: `u.rate = clamp((rate || 0.85) * userRate, 0.3, 2)`. So bleiben die
  relativen Tempi der Phasen erhalten; `userRate` (Default 1) kommt aus
  `sv_lesen_rate` (Slider 0.6–1.3, Schritt 0.1).
- **Lesbarkeit = größere Schrift + mehr Abstand** (asset-frei; **keine** Font-
  Datei). `sv_lesen_font` ∈ {`"normal"`,`"lesbar"`}; angewendet als Attribut
  `data-svfont` am `<html>`, ausgewertet in `shared/base.css`.
- **Bedienelemente** werden von `voice-picker.js` in die vorhandene
  `.voice-wrap` injiziert (DRY — erscheint auf allen Phasen-Seiten). `index.html`
  hat keine `.voice-wrap` → dort keine Regler (dort wird nicht gelesen).
- **Kein Silben-Highlighting** in dieser Welle (bewusste Grenze, phasenspezifisch).

## Datei-Struktur

- Modify: `shared/voice-picker.js`, `shared/base.css`, `shared/dark-mode.css`,
  `CLAUDE.md`, `docs/masterplan.md`.
- Create: `tests/spec/settings.spec.ts`.

---

### Task 1: Tempo-Multiplikator + Schrift-Anwendung (Logik)

**Files:**
- Modify: `shared/voice-picker.js`, `shared/base.css`
- Test: `tests/spec/settings.spec.ts`

- [ ] **Step 1: Keys + Logik in `voice-picker.js`** — direkt nach
      `const VOICE_KEY = "sv_lesen_voice";` (Zeile 5) einfügen:

```js
const RATE_KEY = "sv_lesen_rate";
const FONT_KEY = "sv_lesen_font";
function readUserRate() {
  const v = parseFloat(localStorage.getItem(RATE_KEY));
  return isNaN(v) ? 1 : Math.min(1.5, Math.max(0.6, v));
}
let userRate = readUserRate();
function svRateFor(base) {
  return Math.min(2, Math.max(0.3, (base || 0.85) * userRate));
}
window.svUserRate = () => userRate;
function applyFont() {
  const f = localStorage.getItem(FONT_KEY) === "lesbar" ? "lesbar" : "normal";
  document.documentElement.setAttribute("data-svfont", f);
}
applyFont();
```

- [ ] **Step 2: Tempo in `speak()` skalieren** — Zeile `u.rate = rate || 0.85;`
      ersetzen durch:

```js
  u.rate = svRateFor(rate);
```

- [ ] **Step 3: `base.css` — Lesbarkeits-Regeln** ans Ende von
      `shared/base.css` anhängen:

```css
/* ===== Lesbarkeits-Modus (Welle 5): größere Schrift + mehr Abstand ===== */
:root[data-svfont="lesbar"] {
  font-size: 108%;
}
:root[data-svfont="lesbar"] body {
  letter-spacing: 0.04em;
  line-height: 1.7;
}
```

- [ ] **Step 4: Test schreiben** — `tests/spec/settings.spec.ts`

```ts
import { test, expect } from "@playwright/test";

const PHASE = "/phase1/lese-schule.html";

test.describe("Einstellungen – Tempo-Logik", () => {
  test("svUserRate ist ohne Speicherung 1", async ({ page }) => {
    await page.goto(PHASE);
    await page.evaluate(() => localStorage.removeItem("sv_lesen_rate"));
    await page.reload();
    expect(await page.evaluate(() => (window as any).svUserRate())).toBe(1);
  });

  test("gespeichertes Tempo wird übernommen", async ({ page }) => {
    await page.goto(PHASE);
    await page.evaluate(() => localStorage.setItem("sv_lesen_rate", "1.2"));
    await page.reload();
    expect(await page.evaluate(() => (window as any).svUserRate())).toBeCloseTo(1.2, 5);
  });
});

test.describe("Einstellungen – Lesbarkeit", () => {
  test("data-svfont ist ohne Speicherung 'normal'", async ({ page }) => {
    await page.goto(PHASE);
    await page.evaluate(() => localStorage.removeItem("sv_lesen_font"));
    await page.reload();
    const attr = await page.evaluate(() =>
      document.documentElement.getAttribute("data-svfont"),
    );
    expect(attr).toBe("normal");
  });

  test("Lesbar-Modus setzt Attribut + ändert Body-Abstand", async ({ page }) => {
    await page.goto(PHASE);
    const normal = await page.evaluate(
      () => getComputedStyle(document.body).letterSpacing,
    );
    await page.evaluate(() => localStorage.setItem("sv_lesen_font", "lesbar"));
    await page.reload();
    const attr = await page.evaluate(() =>
      document.documentElement.getAttribute("data-svfont"),
    );
    const lesbar = await page.evaluate(
      () => getComputedStyle(document.body).letterSpacing,
    );
    expect(attr).toBe("lesbar");
    expect(lesbar).not.toBe(normal);
  });
});
```

- [ ] **Step 5: Bauen + Test**

Run: `node build.js` · `npx playwright test spec/settings.spec.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/voice-picker.js shared/base.css tests/spec/settings.spec.ts
git commit -m "✨ Tempo/Lesbarkeit: Tempo-Multiplikator + Schrift-Modus (Logik) + Tests"
```

---

### Task 2: Bedienelemente im Vorlese-Bereich (UI)

**Files:**
- Modify: `shared/voice-picker.js` (Injektion), `shared/base.css` (Styles),
  `shared/dark-mode.css` (Override)
- Test: `tests/spec/settings.spec.ts` (UI-Block)

- [ ] **Step 1: UI-Test anhängen** an `tests/spec/settings.spec.ts`

```ts
test.describe("Einstellungen – Bedienelemente", () => {
  test("Tempo-Slider speichert und bleibt nach Reload erhalten", async ({ page }) => {
    await page.goto(PHASE);
    const slider = page.locator("#svRateSlider");
    await expect(slider).toBeVisible();
    await slider.fill("1.2");
    await slider.dispatchEvent("input");
    expect(await page.evaluate(() => localStorage.getItem("sv_lesen_rate"))).toBe("1.2");
    await page.reload();
    await expect(page.locator("#svRateSlider")).toHaveValue("1.2");
  });

  test("Schrift-Umschalter aktiviert den Lesbar-Modus", async ({ page }) => {
    await page.goto(PHASE);
    await page.evaluate(() => localStorage.removeItem("sv_lesen_font"));
    await page.reload();
    const btn = page.locator("#svFontToggle");
    await expect(btn).toBeVisible();
    await btn.click();
    expect(await page.evaluate(() => localStorage.getItem("sv_lesen_font"))).toBe("lesbar");
    expect(
      await page.evaluate(() => document.documentElement.getAttribute("data-svfont")),
    ).toBe("lesbar");
    await expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `node build.js` · `npx playwright test spec/settings.spec.ts -g "Bedienelemente"`
Expected: FAIL — `#svRateSlider`/`#svFontToggle` fehlen.

- [ ] **Step 3: Injektion in `voice-picker.js`** — ans Ende der Datei anhängen:

```js
// ===== Bedienelemente (Welle 5): Tempo-Slider + Schrift-Umschalter =====
function injectReadingSettings() {
  const pick = document.getElementById("voicePick");
  const wrap =
    (pick && pick.closest(".voice-wrap")) ||
    document.querySelector(".voice-wrap");
  if (!wrap || document.getElementById("svSettings")) return;

  const box = document.createElement("div");
  box.id = "svSettings";
  box.className = "sv-settings";

  // Tempo
  const row = document.createElement("label");
  row.className = "sv-set-row";
  const cap = document.createElement("span");
  cap.textContent = "🐢 Tempo 🐇";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = "svRateSlider";
  slider.min = "0.6";
  slider.max = "1.3";
  slider.step = "0.1";
  slider.value = String(userRate);
  slider.setAttribute("aria-label", "Vorlese-Tempo");
  slider.addEventListener("input", () => {
    userRate = parseFloat(slider.value) || 1;
    localStorage.setItem(RATE_KEY, String(userRate));
  });
  slider.addEventListener("change", () => speak("So schnell lese ich vor."));
  row.appendChild(cap);
  row.appendChild(slider);
  box.appendChild(row);

  // Schrift
  const fontBtn = document.createElement("button");
  fontBtn.type = "button";
  fontBtn.id = "svFontToggle";
  fontBtn.className = "sv-font-toggle";
  const syncFont = () => {
    const on = localStorage.getItem(FONT_KEY) === "lesbar";
    fontBtn.textContent = on ? "🔠 Große Schrift: an" : "🔠 Große Schrift: aus";
    fontBtn.setAttribute("aria-pressed", on ? "true" : "false");
  };
  fontBtn.addEventListener("click", () => {
    const on = localStorage.getItem(FONT_KEY) === "lesbar";
    localStorage.setItem(FONT_KEY, on ? "normal" : "lesbar");
    applyFont();
    syncFont();
  });
  syncFont();
  box.appendChild(fontBtn);

  wrap.appendChild(box);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectReadingSettings);
} else {
  injectReadingSettings();
}
```

- [ ] **Step 4: Styles in `base.css`** anhängen:

```css
/* Einstellungen (Tempo + Schrift) im Vorlese-Bereich */
.sv-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}
.sv-set-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  color: #4a3728;
}
#svRateSlider {
  min-height: var(--tap, 44px);
  touch-action: manipulation;
}
.sv-font-toggle {
  min-height: var(--tap, 44px);
  padding: 6px 14px;
  border: 2px solid #d7c9a8;
  border-radius: 12px;
  background: #fffaf0;
  color: #8b6914;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  touch-action: manipulation;
}
.sv-font-toggle:active {
  transform: scale(0.97);
}
.sv-font-toggle:focus-visible,
#svRateSlider:focus-visible {
  outline: 3px solid #ff6b35;
  outline-offset: 2px;
}
```

- [ ] **Step 5: Dark-Mode-Override** — vor der letzten `}` in `shared/dark-mode.css`:

```css
  /* Einstellungen (Tempo + Schrift) */
  .sv-set-row {
    color: #e0d6c2;
  }
  .sv-font-toggle {
    background: #2d2d44;
    border-color: #6b5a3e;
    color: #e0d6c2;
  }
```

- [ ] **Step 6: Bauen + volle Suite**

Run: `node build.js` · `npx playwright test` → alle grün (bestehende Voice-/
A11y-/Responsive-Tests bleiben grün).

- [ ] **Step 7: Commit**

```bash
git add shared/voice-picker.js shared/base.css shared/dark-mode.css tests/spec/settings.spec.ts
git commit -m "✨ Tempo/Lesbarkeit: Tempo-Slider + Schrift-Umschalter im Vorlese-Bereich"
```

---

### Task 3: Dokumentation + Masterplan-Update

**Files:**
- Modify: `CLAUDE.md`, `docs/masterplan.md`.

- [ ] **Step 1: `CLAUDE.md`** — bei den phasenübergreifenden Keys `sv_lesen_rate`
      (Tempo-Multiplikator) und `sv_lesen_font` (`normal`/`lesbar`, größere Schrift
      + Abstand) ergänzen; bei „Audio" erwähnen, dass `speak()` das Basis-Tempo mit
      `sv_lesen_rate` skaliert.

- [ ] **Step 2: `docs/masterplan.md`** — Welle 5 Status `✅` (Tabelle + Überschrift
      + Task-Checkboxen), Änderungs-Log-Zeile, Learnings (Tempo als Multiplikator;
      „lesefreundlich" asset-frei als größere Schrift + Abstand statt Font-Datei;
      Silben-Highlighting bewusst verschoben; Regler nur auf Phasen-Seiten mit
      `.voice-wrap`).

- [ ] **Step 3: Volle Suite ein letztes Mal**

Run: `node build.js` · `npx playwright test` → alle grün.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/masterplan.md
git commit -m "📝 Tempo/Lesbarkeit: Doku & Masterplan aktualisiert (Welle 5 fertig)"
```

---

## Self-Review

- **Spec-Abdeckung:** Tempo-Multiplikator + Persistenz (Task 1), Schrift-Modus +
  Persistenz (Task 1), Bedienelemente mit A11y (Task 2), Doku (Task 3). ✓
- **Voice-Engine intakt:** nur `u.rate` in `speak()` geändert; alle anderen
  Voice-Funktionen unverändert.
- **Testbarkeit:** `window.svUserRate()` + `data-svfont`-Attribut + Body-
  `letter-spacing` sind direkt prüfbar; UI-Tests treiben Slider/Button real.
- **Typkonsistenz:** Keys `sv_lesen_rate`/`sv_lesen_font`; IDs
  `#svSettings`/`#svRateSlider`/`#svFontToggle`; Klassen `.sv-settings`/
  `.sv-set-row`/`.sv-font-toggle`.
- **Nicht nach master pushen/mergen** — nur Branch + Ergebnis berichten.
