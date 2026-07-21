# Welle 3 — `shared/speak-text.js` (`svSay.*`) — Ausführungsplan

> **Status:** Entwurf (vor Umsetzung).
> **Für agentische Worker:** REQUIRED SUB-SKILL `superpowers:executing-plans`.
> Checkbox-Syntax (`- [ ]`). Welle endet mit grünem Build **und** Tests **und
> eigenem Commit**. Mapping & Abhängigkeiten:
> `docs/refactoring-shared-engine-wellen-index.md`.

**Quelle & Einordnung**

- **Primär (Wie?):** `docs/plan-refactoring-shared-engine.md` → **Task 3**.
- **Architektur (Warum?):** Design-Spec → **Schritt 3** (Sprach-Helfer +
  Highlight-Sync; Timing der ausführlichsten Phase als Referenz).
- **Rolle:** Vereinheitlicht die in Phase 2/3/4 kopierten Sprach-Helfer.
  Unabhängig von Welle 2, baut auf Welle 1 auf. Liefert `svSay` für **Welle 4**
  (`svFlash`) und **Welle 5** (`makeWordTile`).

**Ziel:** `sayWord`/`renderSyllables`/`speakWordBySyllables` (Phase 2/3) und
`sayWord`/`saySentence`/`speakLineByWords` (Phase 4) in ein `shared/speak-text.js`
zusammenführen. Phasen-relative Tempi bleiben über Parameter erhalten —
**kein hörbarer Unterschied** zur Baseline.

**Tech-Stack:** Vanilla JS (IIFE), Web Speech API (`speechSynthesis`) über
`shared/voice-picker.js`, Playwright.

## Gemeinsame Vorgaben (Kurzform — volle Fassung im Masterplan)

Gegen `dist/` prüfen · `node build.js` vor jeder Prüfung · Shared-Block **dreifach**
registrieren · Engine-Module **nach** `voice-picker`/`celebrate`/`srs` (Abhängigkeit
auf `speak`/`saySyllable`) · Sprech-Texte **kleinschreiben** (`toLowerCase()`),
Anlaut-Prinzip · zentrales Tempo über `speak(text, base)`/`svRateFor` — nie umgehen ·
Deutsch+Emoji bei Texten/Kommentaren/Commits · keine Änderung an bestehenden
Shared-Bausteinen außer Einhängen.

## Verifikations-Kommandos

```
V-BUILD:  node build.js  + JS-Syntax-Check (Snippet s. Masterplan); danach: grep -rn "#INCLUDE" dist/phase*/*.html  ( muss leer sein )
V-TEST:   cd tests && npx playwright test
V-SNAP:   manuelle Checkliste; hier Schwerpunkt Audio (Punkt 2): Emoji/Silben antippen → deutsche Stimme spricht silbenweise mit Highlight, dann flüssig; kein Buchstabieren
```

## Datei-Struktur

- **Create:** `shared/speak-text.js`
- **Modify:** `build.js` (`includes`-Map)
- **Modify:** alle vier Phasen (Marker; Ph2/3/4: lokale Sprach-Funktionen löschen + Aufrufe umstellen; Ph1: nur Marker, Code unverändert)

## Modul-Verträge

- **Consumes:** `window.speak(text, baseRate)`, `saySyllable(syl)` aus
  `shared/voice-picker.js`.
- **Produces (global):**
  - `window.svSay.word(text, rate?) -> void` — `speak(String(text).toLowerCase(),
    rate || 0.85)`.
  - `window.svSay.renderSyllables(container, silbenArr) -> void` — baut `.syl`-
    Spans mit `·`-Trennern (wie Phase 2 `:899-913`).
  - `window.svSay.bySyllables(silbenArr, wordText, sylSpans?, opts?) -> void` —
    silbenweise sprechen mit `.lit`-Highlight, dann flüssiges Wort;
    `opts.step` Default 620 ms, `opts.tail` Default 120 ms, `opts.rate` Default 0.85.
  - `window.svSay.line(spans, words, done?) -> void` — Phase-4-Variante:
    Wort-für-Wort mit `.lit`, dann ganzer Satz; Timing 720/160 ms, Wort-Rate 0.8.

> **Vereinheitlichung (erwartete Abweichung):** Heute nutzen Phase 2/3
> `speakWordBySyllables` mit Timing 620/120 und `sayWord`-Rate 0.85, Phase 4
> `speakLineByWords` mit 720/160 und `sayWord`-Rate 0.8. Diese phasen-relativen
> Tempi bleiben über die Parameter erhalten (Phase 4 ruft mit eigenem
> `rate`/Timing auf). **Kein hörbarer Unterschied** gegenüber Baseline.

---

### Task 3: `shared/speak-text.js`

- [ ] **Step 3.1: Modul anlegen** — erstelle `shared/speak-text.js`:

```js
/* shared/speak-text.js — Silben-/Wort-/Satz-Sprachausgabe mit Highlight.
   Global: svSay.{word,renderSyllables,bySyllables,line}.
   Baut auf speak()/saySyllable() aus voice-picker.js auf. */
(function () {
  function word(text, rate) {
    speak(String(text).toLowerCase(), rate || 0.85);
  }
  function renderSyllables(container, silben) {
    container.replaceChildren();
    silben.forEach((syl, i) => {
      if (i > 0) {
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.textContent = "·";
        container.appendChild(dot);
      }
      const s = document.createElement("span");
      s.className = "syl";
      s.textContent = syl;
      container.appendChild(s);
    });
  }
  function bySyllables(silben, wordText, sylSpans, opts) {
    const o = opts || {};
    const stepMs = o.step || 620;
    const tailMs = o.tail || 120;
    const rate = o.rate || 0.85;
    let i = 0;
    const step = () => {
      if (sylSpans) sylSpans.forEach((s) => s.classList.remove("lit"));
      if (i < silben.length) {
        if (sylSpans && sylSpans[i]) sylSpans[i].classList.add("lit");
        saySyllable(silben[i]);
        i++;
        setTimeout(step, stepMs);
      } else {
        setTimeout(() => {
          word(wordText, rate);
          if (sylSpans) sylSpans.forEach((s) => s.classList.remove("lit"));
        }, tailMs);
      }
    };
    step();
  }
  function line(spans, words, done) {
    let i = 0;
    const step = () => {
      spans.forEach((s) => s.classList.remove("lit"));
      if (i < words.length) {
        if (spans[i]) spans[i].classList.add("lit");
        word(words[i], 0.8);
        i++;
        setTimeout(step, 720);
      } else {
        setTimeout(() => {
          speak(words.join(" ").toLowerCase(), 0.85);
          spans.forEach((s) => s.classList.remove("lit"));
          if (done) done();
        }, 160);
      }
    };
    step();
  }
  window.svSay = { word, renderSyllables, bySyllables, line };
})();
```

- [ ] **Step 3.2: `build.js` registrieren** — `"shared/speak-text.js": loadShared("speak-text.js"),`.

- [ ] **Step 3.3: Marker setzen** — in allen vier Phasen **nach** `progress.js`:
  `// #INCLUDE shared/speak-text.js`.

- [ ] **Step 3.4: Phase 2 umstellen**
- Lösche `sayWord` (`:866-868`), `renderSyllables` (`:899-913`),
  `speakWordBySyllables` (`:916-933`).
- Aufrufe ersetzen: `sayWord(x)` → `svSay.word(x, 0.85)`;
  `renderSyllables(c, w)` → `svSay.renderSyllables(c, w.silben)`;
  `speakWordBySyllables(w, spans)` → `svSay.bySyllables(w.silben, w.id, spans)`;
  `speakWordBySyllables(w, null)` → `svSay.bySyllables(w.silben, w.id, null)`:

```bash
grep -n "sayWord\|renderSyllables\|speakWordBySyllables" phase2/phase2-schule.html
```

- [ ] **Step 3.5: Phase 3 umstellen** — identisch zu 3.4 (Phase 3 hat dieselben
  drei Funktionen + `sayWord`-Rate 0.85; per `grep` verifizieren).

- [ ] **Step 3.6: Phase 4 umstellen**
- Lösche `sayWord` (`:816-818`), `saySentence` (`:819-821`),
  `speakLineByWords` (`:900-918`). `renderSentenceLine`/`flashLit` **bleiben**
  (phasenspezifisch, kommen in Welle 5/phasenspezifisch).
- Aufrufe ersetzen: `sayWord(w)` → `svSay.word(w, 0.8)`;
  `saySentence(words)` → `svSay.word(words.join(" "), 0.85)`;
  `speakLineByWords(spans, words, done)` → `svSay.line(spans, words, done)`.

- [ ] **Step 3.7: Phase 1 — nur Marker, Code unverändert**
Phase 1 nutzt für Buchstaben `speak(spokenWord(l.merkwort))` direkt (kein
`sayWord`) und `saySyllable` für Silben-Chips — bleibt **unverändert**. Phase 1
bekommt hier **keine** Code-Änderung außer dem gesetzten Marker (damit `svSay`
verfügbar ist, falls Welle 5 ihn braucht). **Marker trotzdem setzen.**

## Verifikation dieser Welle

- [ ] **Step V.1: V-BUILD** — 4× `OK`, kein `ERR`, keine `#INCLUDE`-Reste in `dist/`.
- [ ] **Step V.2: V-TEST** — alle grün.
- [ ] **Step V.3: V-SNAP** — Audio-Punkt (2) für Phase 2/3/4: Highlight-Timing
  muss sich wie Baseline anfühlen (silbenweise `.lit`, dann flüssiges Wort /
  ganzer Satz). Kein Buchstabieren.

## Erwartete Abweichung

**Keine hörbare.** Phasen-relative Tempi (620/120 Ph2/3, 720/160 Ph4; Raten
0.85/0.8) werden über Parameter durchgereicht und bleiben identisch zur Baseline.

## Commit

```bash
git add shared/speak-text.js build.js phase1 phase2 phase3 phase4
git commit -m "♻️ Refactor: Sprach-Helfer nach shared/speak-text.js"
```

## Übergabe / Nächste Welle

Nach Merge: **Welle 4** (`shared/exercises.js`) braucht `svSay.word` aus *dieser*
Welle + `svShuffle` aus Welle 1. **Welle 5** (`makeWordTile`) braucht
`svSay.renderSyllables/bySyllables`.
