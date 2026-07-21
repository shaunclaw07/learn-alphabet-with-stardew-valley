# Welle 4 — `shared/exercises.js` (`svFlash` — Blitz-Karten) — Ausführungsplan

> **Status:** Entwurf (vor Umsetzung).
> **Für agentische Worker:** REQUIRED SUB-SKILL `superpowers:executing-plans`.
> Checkbox-Syntax (`- [ ]`). Welle endet mit grünem Build **und** Tests **und
> eigenem Commit**. Mapping & Abhängigkeiten:
> `docs/refactoring-shared-engine-wellen-index.md`.

**Quelle & Einordnung**

- **Primär (Wie?):** `docs/plan-refactoring-shared-engine.md` → **Task 4**.
- **Architektur (Warum?):** Design-Spec → **Schritt 4** — **bewusst
  eingeschränkt** auf den einzigen *zeichengleichen* Modus (Blitz-Karten).
- **Rolle:** Vereinheitlicht die in Phase 2 & 3 identisch kopierten Flashcard.
  Braucht `svShuffle` (Welle 1) + `svSay.word` (Welle 3).

**Ziel:** Die Blitz-Karten-Engine (`fDeck/fIdx/fStars/fFlipped`, `startFlash`/
`renderFlash/flashRead/flashFlip/flashNext`) aus Phase 2 & 3 in
`shared/exercises.js` (`svFlash`) heben.

> **Scope-Entscheidung (YAGNI-Grenze):** Die anderen Übungsmodi sind **nicht**
> gleich genug, um sie ohne Verhaltensänderung zu verschmelzen: Phase 1 Quiz =
> Aufdecken/Selbsteinschätzung, Phase 3 = Bild-Multiple-Choice, Phase 4 =
> Wort-Multiple-Choice, Phase 2/4 = Silben-/Satz-Bauer. Eine 1:1-Vereinheitlichung
> überschritte „kleine Vereinheitlichung". Deshalb hier **nur** die Blitz-Karten
> (Phase 2 & 3, bis auf Whitespace identisch). Quiz/Builder bleiben pro Phase
> (bewusste Grenze; kann später als eigener Plan folgen, sobald sich `svFlash`
> bewährt hat).

**Tech-Stack:** Vanilla JS (IIFE), Playwright.

## Gemeinsame Vorgaben (Kurzform — volle Fassung im Masterplan)

Gegen `dist/` prüfen · `node build.js` vor jeder Prüfung · Shared-Block **dreifach**
registrieren · Engine-Module **nach** `voice-picker`/`celebrate`/`srs`/`reader-util`/
`progress`/`speak-text` · Sprech-Texte kleinschreiben · Deutsch+Emoji bei
Texten/Kommentaren/Commits · keine Änderung an bestehenden Shared-Bausteinen außer Einhängen.

## Verifikations-Kommandos

```
V-BUILD:  node build.js  + JS-Syntax-Check (Snippet s. Masterplan); danach: grep -rn "#INCLUDE" dist/phase*/*.html  ( muss leer sein )
V-TEST:   cd tests && npx playwright test
V-SNAP:   manuelle Checkliste; hier Schwerpunkt Übungen (Punkt 3): Blitz-Modus Ph2/3 — Karte umdrehen (spricht Wort), Weiter zählt ⭐, Ende 🏆
```

## Datei-Struktur

- **Create:** `shared/exercises.js`
- **Modify:** `build.js` (`includes`-Map)
- **Modify:** `phase2/phase2-schule.html`, `phase3/phase3-schule.html` (Marker + lokale Flash-Engine löschen + Buttons umstellen)

## Modul-Verträge

- **Consumes:** `window.svShuffle`, `window.svSay.word`.
- **Produces (global):**
  - `window.svFlash.mount(cfg) -> void` — `cfg = { items, elIds, wordKey,
    emojiKey, rate? }` mit `elIds = { stars, total, index, card, word, emoji }`.
    Baut eigenes Deck (`svShuffle([...items])`), rendert aktuelle Karte, verdrahtet
    **nichts** an Buttons (Buttons rufen weiterhin global `svFlash.read/flip/next`).
  - `window.svFlash.read()`, `window.svFlash.flip()`, `window.svFlash.next()`.

> **Beleg der Gleichheit:** Phase 2 `:1274-1326` und Phase 3 `:1195-1247` sind
> bis auf Whitespace identisch (`fDeck/fIdx/fStars/fFlipped`,
> `startFlash/renderFlash/flashRead/flashFlip/flashNext`, IDs `fStars/fTotal/
> fIndex/fCard/fWord/fEmoji`). **Erwartete Abweichung:** keine.

---

### Task 4: `shared/exercises.js` (`svFlash`)

- [ ] **Step 4.1: HTML-IDs beider Phasen abgleichen**
Bestätige, dass beide Phasen exakt die IDs `fStars,fTotal,fIndex,fCard,fWord,
fEmoji` und die onclick-Verdrahtung der Blitz-Buttons nutzen:

```bash
grep -n "fStars\|fTotal\|fIndex\|fCard\|fWord\|fEmoji\|flashRead\|flashFlip\|flashNext" phase2/phase2-schule.html phase3/phase3-schule.html
```

Weichen IDs ab: STOPP und zurückmelden — dann ist die Vereinheitlichung nicht
verhaltensneutral.

- [ ] **Step 4.2: Reale Sprech-Raten auslesen**
Phase 2 & 3 nutzen heute `sayWord` mit Rate 0.85 bzw. evtl. 0.8 (nach Welle 3:
`svSay.word(..., RATE)`). Prüfe: `grep -n "svSay.word\|function sayWord"
phase2/phase2-schule.html phase3/phase3-schule.html`. Ist Phase 3 = 0.8, `rate`
über `cfg.rate` durchreichen statt hart 0.85. **Verhaltensneutralität hat Vorrang**
vor Vereinheitlichung der Rate.

- [ ] **Step 4.3: Modul anlegen** — erstelle `shared/exercises.js`:

```js
/* shared/exercises.js — geteilte Übungs-Engines.
   Global: svFlash (Blitz-Karten). Quiz/Builder bleiben (noch) pro Phase. */
(function () {
  const F = { deck: [], idx: 0, stars: 0, flipped: false, ids: null, rate: 0.85 };
  function els() { return F.ids; }
  function set(id, txt) {
    const e = document.getElementById(id);
    if (e) e.textContent = txt;
  }
  function renderFlash() {
    const w = F.deck[F.idx];
    F.flipped = false;
    const card = document.getElementById(els().card);
    if (card) card.classList.remove("flipped");
    set(els().word, w.word);
    set(els().emoji, w.emoji);
    set(els().index, F.idx + 1);
  }
  window.svFlash = {
    mount(cfg) {
      F.ids = cfg.elIds;
      F.rate = cfg.rate || 0.85;
      F.deck = window.svShuffle(
        cfg.items.map((it) => ({ word: it[cfg.wordKey], emoji: it[cfg.emojiKey] }))
      );
      F.idx = 0;
      F.stars = 0;
      set(els().stars, "");
      set(els().total, F.deck.length);
      renderFlash();
    },
    read() {
      const w = F.deck[F.idx];
      if (w) window.svSay.word(w.word, F.rate);
    },
    flip() {
      const card = document.getElementById(els().card);
      F.flipped = !F.flipped;
      if (card) card.classList.toggle("flipped", F.flipped);
      if (F.flipped) {
        const w = F.deck[F.idx];
        if (w) window.svSay.word(w.word, F.rate);
      }
    },
    next() {
      F.stars = Math.min(F.deck.length, F.stars + 1);
      set(els().stars, "⭐".repeat(F.stars));
      F.idx++;
      if (F.idx >= F.deck.length) {
        set(els().word, "🏆");
        set(els().emoji, "🎉");
        const card = document.getElementById(els().card);
        if (card) card.classList.add("flipped");
        set(els().index, F.deck.length);
        return;
      }
      renderFlash();
    },
  };
})();
```

- [ ] **Step 4.4: `build.js` registrieren** + **Marker** nach `speak-text.js` in
  Phase 2 & 3: `// #INCLUDE shared/exercises.js`.

- [ ] **Step 4.5: Phase 2 umstellen**
- Lösche `fDeck/fIdx/fStars/fFlipped` + `startFlash/renderFlash/flashRead/
  flashFlip/flashNext` (`:1274-1326`).
- Start-Aufruf `startFlash();` (`:1331`) ersetzen durch (Raten aus 4.2 einsetzen):

```js
      svFlash.mount({
        items: WORDS, wordKey: "id", emojiKey: "emoji", rate: 0.85,
        elIds: { stars: "fStars", total: "fTotal", index: "fIndex",
                 card: "fCard", word: "fWord", emoji: "fEmoji" },
      });
```

- Blitz-Button-`onclick`/Listener `flashRead/flashFlip/flashNext` →
  `svFlash.read()/svFlash.flip()/svFlash.next()` (können in inline `onclick`
  **oder** als `addEventListener` stehen — beide Fundstellen umstellen):

```bash
grep -n "flashRead\|flashFlip\|flashNext" phase2/phase2-schule.html
```

- [ ] **Step 4.6: Phase 3 umstellen** — identisch zu 4.5. Start-Aufruf
  `startFlash();` (`:1252`) ersetzen, `:1195-1247` löschen, Buttons umstellen.
  Raten aus 4.2 einsetzen (ggf. `rate: 0.8`).

## Verifikation dieser Welle

- [ ] **Step V.1: V-BUILD** — 4× `OK`, kein `ERR`, keine `#INCLUDE`-Reste in `dist/`.
- [ ] **Step V.2: V-TEST** — alle grün.
- [ ] **Step V.3: V-SNAP** — Blitz-Modus in Phase 2 & 3: Karte umdrehen (spricht
  Wort), Weiter zählt ⭐, Ende zeigt 🏆.

## Erwartete Abweichung

**Keine.** Gleiche IDs, gleiche Tempi (über `cfg.rate` phasengerecht gesetzt),
gleiches Verhalten. Bewusst *keine* Vereinheitlichung von Quiz/Buildern
(diese bleiben pro Phase).

## Commit

```bash
git add shared/exercises.js build.js phase2 phase3
git commit -m "♻️ Refactor: Blitz-Karten nach shared/exercises.js (svFlash)"
```

## Übergabe / Nächste Welle

Nach Merge: **Welle 5** (`shared/reader.js`/`makeWordTile`) — unabhängig von
dieser Welle, braucht aber Welle 2 + 3. Quiz/Builder bleiben (bewusst) pro Phase.
