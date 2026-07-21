# Welle 5 — `shared/reader.js` (`svReader.makeWordTile`) — Ausführungsplan

> **Status:** Entwurf (vor Umsetzung).
> **Für agentische Worker:** REQUIRED SUB-SKILL `superpowers:executing-plans`.
> Checkbox-Syntax (`- [ ]`). Welle endet mit grünem Build **und** Tests **und
> eigenem Commit**. Mapping & Abhängigkeiten:
> `docs/refactoring-shared-engine-wellen-index.md`.

**Quelle & Einordnung**

- **Primär (Wie?):** `docs/plan-refactoring-shared-engine.md` → **Task 5**.
- **Architektur (Warum?):** Design-Spec → Schritt 1 (Teil `makeTile`) +
  Schritt 4 (Item-Card-Renderer). Der Design-Entwurf fasst `makeTile` noch in
  `reader-util.js`; der Masterplan (code-akkurat) isoliert es in eigenes
  `reader.js`, weil es von `svProgress` + `svSay` abhängt → eigene Welle.
- **Rolle:** Vereinheitlicht die in Phase 2 & 3 nahezu identische `makeWordTile`.
  Braucht `svProgress.{has,toggle}` (Welle 2) + `svSay.{renderSyllables,
  bySyllables}` (Welle 3).

**Ziel:** Die `makeWordTile`-Fabrik (Phase 2 `:1114-1156`, Phase 3 analog) in
`shared/reader.js` (`svReader.makeWordTile`) heben.

> **Bewusste Grenze (YAGNI):** Phase 4 (`makeSentenceTile`) und Phase 1
> (Buchstaben-Karte) haben abweichendes Layout und bleiben **phasenspezifisch**.
> Nur der echte Zwilling Ph2/Ph3 wird geteilt.

**Tech-Stack:** Vanilla JS (IIFE), DOMParser, Playwright.

## Gemeinsame Vorgaben (Kurzform — volle Fassung im Masterplan)

Gegen `dist/` prüfen · `node build.js` vor jeder Prüfung · Shared-Block **dreifach**
registrieren · Engine-Module **nach** `voice-picker`/`celebrate`/`srs`/`reader-util`/
`progress`/`speak-text`/`exercises` · Sprech-Texte kleinschreiben · Deutsch+Emoji ·
keine neuen `localStorage`-Keys (Fortschritt läuft über `svProgress`) · keine
Änderung an bestehenden Shared-Bausteinen außer Einhängen.

## Verifikations-Kommandos

```
V-BUILD:  node build.js  + JS-Syntax-Check (Snippet s. Masterplan); danach: grep -rn "#INCLUDE" dist/phase*/*.html  ( muss leer sein )
V-TEST:   cd tests && npx playwright test
V-SNAP:   manuelle Checkliste; hier Schwerpunkt Wort-Kacheln Ph2/3 (Punkt 1+2): Emoji/Silben sprechen, „Kann ich" togglet + persistiert, Layout identisch zur Baseline (inkl. Dark Mode)
```

## Datei-Struktur

- **Create:** `shared/reader.js`
- **Modify:** `build.js` (`includes`-Map)
- **Modify:** `phase2/phase2-schule.html`, `phase3/phase3-schule.html` (Marker + lokale `makeWordTile` löschen + Aufruf umstellen)

## Modul-Verträge

- **Consumes:** `window.svProgress.{has,toggle}`, `window.svSay.{renderSyllables,
  bySyllables}`.
- **Produces (global):**
  - `window.svReader.makeWordTile(w, opts) -> HTMLElement` — `opts = { hearLabel,
    doneLabelOn, doneLabelOff, showBezug }`. Baut die `.word-tile` inkl. Emoji,
    Silben, „🔊"-Zeile, optionalem `.word-bezug` (aus `w.bezug` via DOMParser) und
    „Kann ich"-Button (`svProgress.toggle`).

---

### Task 5: `shared/reader.js`

- [ ] **Step 5.1: Vergleich bestätigen**

```bash
diff <(sed -n '1114,1156p' phase2/phase2-schule.html) <(grep -n "function makeWordTile" -A42 phase3/phase3-schule.html | sed 's/^[0-9-]*[:-]//')
```

Notiere Unterschiede (z. B. hat Phase 3 evtl. `kat`-Badges oder kein `bezug`).
Nur gemeinsame Teile teilen; abweichende Teile über `opts` steuerbar machen.

- [ ] **Step 5.2: Modul anlegen** — übernimm die Phase-2-`makeWordTile`
  (`:1114-1156`) 1:1, ersetze `completed.has` → `svProgress.has`, `toggleWord` →
  `svProgress.toggle`, `renderSyllables(syll, w)` →
  `svSay.renderSyllables(syll, w.silben)`, `speakWordBySyllables(w, spans())` →
  `svSay.bySyllables(w.silben, w.id, spans())`. `.word-bezug`-Block **bedingt**
  (`if (opts.showBezug && w.bezug)`), da Phase 3 evtl. kein `bezug` hat. Labels
  aus `opts`. Erstelle `shared/reader.js`:

```js
/* shared/reader.js — geteilte Wort-Kachel für Silben-Phasen (2 & 3).
   Global: svReader.makeWordTile(w, opts). */
(function () {
  window.svReader = {
    makeWordTile(w, opts) {
      const o = opts || {};
      const tile = document.createElement("div");
      tile.className = "word-tile" + (window.svProgress.has(w.id) ? " done" : "");
      tile.id = "word-" + w.id;

      const emoji = document.createElement("div");
      emoji.className = "word-emoji";
      emoji.textContent = w.emoji;
      emoji.title = "Antippen zum Hören";
      const syll = document.createElement("div");
      syll.className = "word-syllables";
      window.svSay.renderSyllables(syll, w.silben);
      syll.title = "Antippen zum Hören";

      const sylSpans = () => [...syll.querySelectorAll(".syl")];
      const hearIt = () => window.svSay.bySyllables(w.silben, w.id, sylSpans());
      emoji.addEventListener("click", hearIt);
      syll.addEventListener("click", hearIt);
      tile.appendChild(emoji);
      tile.appendChild(syll);

      const hear = document.createElement("div");
      hear.className = "word-hear";
      hear.textContent = o.hearLabel || "🔊 antippen & zusammenlesen";
      tile.appendChild(hear);

      if (o.showBezug && w.bezug) {
        const bezug = document.createElement("div");
        bezug.className = "word-bezug";
        const frag = new DOMParser().parseFromString(w.bezug, "text/html");
        while (frag.body.firstChild) bezug.appendChild(frag.body.firstChild);
        tile.appendChild(bezug);
      }

      const btn = document.createElement("button");
      btn.className = "word-done-btn";
      const done = window.svProgress.has(w.id);
      btn.textContent = done ? (o.doneLabelOn || "⭐ Kann ich!")
                             : (o.doneLabelOff || "✋ Kann ich lesen");
      btn.addEventListener("click", () => window.svProgress.toggle(w.id));
      tile.appendChild(btn);
      return tile;
    },
  };
})();
```

- [ ] **Step 5.3: `build.js` registrieren** + **Marker** nach `exercises.js` in
  Phase 2 & 3: `// #INCLUDE shared/reader.js`.

- [ ] **Step 5.4: Phase 2 umstellen** — `function makeWordTile` (`:1114-1156`)
  löschen; Aufruf `makeWordTile(w)` (`:1080`) →
  `svReader.makeWordTile(w, { showBezug: true })`.

- [ ] **Step 5.5: Phase 3 umstellen** — `makeWordTile` löschen; Aufruf ersetzen.
  `showBezug` nur setzen, wenn Phase 3 `bezug` hat (aus 5.1). Falls Phase 3
  zusätzliche Elemente (z. B. Kategorie-Badge) in der Kachel hatte, diese im
  Aufruf-Kontext **nach** `svReader.makeWordTile(...)` an das zurückgegebene
  Element anhängen — **nicht** ins geteilte Modul ziehen.

## Verifikation dieser Welle

- [ ] **Step V.1: V-BUILD** — 4× `OK`, kein `ERR`, keine `#INCLUDE`-Reste in `dist/`.
- [ ] **Step V.2: V-TEST** — alle grün.
- [ ] **Step V.3: V-SNAP** — Wort-Kacheln in Phase 2 & 3: Emoji/Silben sprechen,
  „Kann ich" togglet + persistiert (Reload), Layout identisch zur Baseline
  (inkl. Dark Mode + Responsive 320/375/768 px).

## Erwartete Abweichung

**Keine.** Gleiche Kachel-Struktur, gleiche Labels (Defaults = bisherige Texte),
`bezug` nur wo vorhanden. Phasenspezifische Zusätze (z. B. `kat`-Badge) bleiben
pro Phase und werden ans zurückgegebene Element angehängt.

## Commit

```bash
git add shared/reader.js build.js phase2 phase3
git commit -m "♻️ Refactor: Wort-Kachel nach shared/reader.js (svReader.makeWordTile)"
```

## Übergabe / Nächste Welle

Nach Merge: **Welle 6** (HTML-Chrome) — code-seitig unabhängig, baut aber auf dem
stabilen Marker-Stand aller Vorgänger auf. Phase 1 (Buchstaben-Karte) und Phase 4
(`makeSentenceTile`) bleiben bewusst phasenspezifisch.
