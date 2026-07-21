# Refactoring „Gemeinsame Lese-Engine" — Implementierungsplan

> **Für den ausführenden Agenten:** Setze diesen Plan Task für Task um. Jeder Task
> endet mit einem grünen Build **und** grünen Playwright-Tests und **einem eigenen
> Commit**. Steps mit Checkbox (`- [ ]`) abhaken. Dies ist ein **verhaltens-
> erhaltendes Refactoring** — kein neues Feature. Es gibt (noch) keine JS-Unit-
> Tests im Projekt; die Absicherung ist: `node build.js` → JS-Syntax-Check →
> Playwright-Suite → manuelle Verhaltens-Checkliste (siehe Task 0).

**Ziel:** Fast identisch kopierten JS-/HTML-Code der vier Phasen-HTMLs in neue
`shared/`-Module heben, sodass jede Phase auf **Inhaltsdaten + dünne
Verdrahtung** schrumpft — bei unverändertem sichtbaren Verhalten (kleine
Vereinheitlichungen der Übungsmodi erlaubt und markiert).

**Architektur:** Neue Text-Module in `shared/` werden per `#INCLUDE`-Marker von
`build.js` in jede Phasen-HTML inlined; das gebaute Ergebnis in `dist/` bleibt
self-contained. Daten-Arrays (`letters`/`words`/`SENTENCES`) und phasenspezifische
Metadaten bleiben pro Phase. Bestehende Shared-Bausteine (`voice-picker.js`,
`celebrate.js`, `srs.js`, `farm.js`, `trace.js`, `base.css`, `dark-mode.css`)
bleiben unverändert und werden von den neuen Modulen genutzt.

**Tech-Stack:** Vanilla JS (ES2020, keine Frameworks), CSS, Node-Build
(`build.js`), Playwright (`tests/`), PWA-Service-Worker (`sw.js`).

**Design-Referenz:** `docs/superpowers/specs/2026-07-21-refactoring-shared-engine-design.md`
(nicht versioniert, lokales Arbeitsartefakt).

## Global Constraints

Diese Regeln gelten für **jeden** Task (aus CLAUDE.md, wörtlich):

- **Immer gegen `dist/` prüfen**, nie gegen die Source-HTMLs. Vor jeder Prüfung
  `node build.js` laufen lassen.
- **Neuen Shared-Block dreifach registrieren:** (1) Datei in `shared/` anlegen,
  (2) `#INCLUDE`-Marker in den Phasen setzen, (3) in `build.js` in die
  `includes`-Map eintragen. Fehlt (3), bleibt der Marker als Kommentar stehen.
- **Marker-Reihenfolge:** neue Engine-Module **nach** den `#INCLUDE`s von
  `voice-picker.js`, `celebrate.js`, `srs.js` einbinden (Abhängigkeit auf
  `speak`, `svCorrect`, `svSrsSortDueFirst` usw.).
- **Keine neuen `localStorage`-Keys, kein geändertes ID-Schema.** Erhalten
  bleiben: `sv_lesen_phase{1..4}_progress`, SRS-IDs `p<phase>:<id>`,
  `sv_lesen_srs`, `sv_lesen_farm`, `sv_lesen_voice/muted/daily/rate/font`.
- **Buchstaben/Wörter/Sätze zum Sprechen kleinschreiben** (`toLowerCase()`),
  Anlaut-Prinzip beibehalten. Sprech-Tempo läuft zentral über `speak(text,
  base)` / `svRateFor` aus `voice-picker.js` — nie umgehen.
- **Alle Nutzertexte/Kommentare/Commit-Messages auf Deutsch**, Commits mit
  Emoji-Präfix.
- **`CACHE_VERSION` in `sw.js` erhöhen**, sobald gecachte Seiten oder inlined
  `shared/`-Blöcke sich ändern. In diesem Plan **einmal am Ende** (Task 7),
  weil zwischendurch nicht deployt wird. (Wird zwischendurch doch gepusht:
  jeweils bumpen.) Aktueller Stand: `sv-lesen-v6`.
- **Nicht auf `master` committen** ohne Feature-Branch (siehe Task 0).
- **Keine Änderung** an Druckversionen (`phaseN-druckversion.html`),
  `lehrplan.html`, `lesen-lernen-lehrplan.md` oder bestehenden Shared-Bausteinen
  außer dem Einhängen der neuen Module.

## Verifikations-Kommandos (in mehreren Tasks referenziert)

**V-BUILD** — Build + JS-Syntax-Check aller vier gebauten Phasen:
```bash
node build.js
node -e 'const fs=require("fs");["dist/phase1/lese-schule.html","dist/phase2/phase2-schule.html","dist/phase3/phase3-schule.html","dist/phase4/phase4-schule.html"].forEach(f=>{const h=fs.readFileSync(f,"utf8");[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new Function(m[1])}catch(e){console.log("ERR",f,"script#"+i,e.message);process.exit(1)}});console.log("OK",f)})'
```
Erwartet: 4× `OK …`, kein `ERR`.

**V-TEST** — Playwright-Suite (die `ConnectionAbortedError`-Zeilen sind
harmloses Rauschen):
```bash
cd tests && npx playwright test
```
Erwartet: alle Specs grün (a11y, navigation, progress, pwa, responsive, structure).
(Einmalig vorher, falls noch nie gelaufen: `cd tests && npm ci && npx playwright install chromium`.)

**V-SNAP** — manuelle Verhaltens-Checkliste (Task 0 legt die Baseline an; nach
jedem Task gegenprüfen). Für die betroffene(n) Phase(n) `dist/…html` im Browser
öffnen und stichprobenartig prüfen:
1. **Fortschritt:** ein Item als „kann ich" markieren → Progress-Bar + Label
   aktualisiert; Reload → bleibt markiert; alle Items → Zertifikat sichtbar.
2. **Audio:** Emoji/Silben antippen → deutsche Stimme spricht silbenweise mit
   Highlight, dann flüssig; kein Buchstabieren.
3. **Übungen:** je einen Durchlauf Quiz / Builder / Blitz — richtig → ⭐ + Lob,
   falsch → Shake + Serie/​SRS-Reset, Ende → Fanfare.
4. **Dark Mode** (OS-Theme dunkel) + **Responsive** (Fenster 320/375/768 px,
   kein horizontaler Body-Scroll).

---

## Task 0: Baseline & Feature-Branch

**Files:** keine Code-Änderung.

- [ ] **Step 1: Feature-Branch anlegen**
```bash
git checkout master && git pull
git checkout -b refactor/shared-engine
```

- [ ] **Step 2: Ausgangs-Build & Tests grün bestätigen**

Führe **V-BUILD** und **V-TEST** aus. Beide müssen bereits **vor** jeder
Änderung grün sein. Sind sie es nicht, STOPP und melde das zurück — dann ist die
Baseline kaputt und Regressionen wären nicht unterscheidbar.

- [ ] **Step 3: Verhaltens-Baseline notieren**

Öffne alle vier `dist/…html` und arbeite **V-SNAP** einmal pro Phase durch.
Notiere pro Phase kurz das Ist-Verhalten (v. a. die Übungs-Bedienung: Phase 1
Quiz = „aufdecken & selbst einschätzen"; Phase 2 = Silben-Bauer + Blitz; Phase 3
= Bild-Quiz mit 3 Antwort-Buttons + Blitz; Phase 4 = Satz-Bauer + Wort-Quiz).
Diese Notiz ist die Referenz für „erwartete Abweichung" in den späteren Tasks.

- [ ] **Step 4: Commit (leerer Marker-Commit als Branch-Start)**
```bash
git commit --allow-empty -m "🔧 Refactor-Start: Baseline shared-engine (Build+Tests grün)"
```

---

## Task 1: `shared/reader-util.js` — Kleinkram (`shuffle`, `scrollToId`)

**Files:**
- Create: `shared/reader-util.js`
- Modify: `build.js` (`includes`-Map)
- Modify: `phase2/phase2-schule.html`, `phase3/phase3-schule.html`,
  `phase4/phase4-schule.html`, `phase1/lese-schule.html` (Marker + lokale Kopien
  entfernen)

**Interfaces:**
- Produces (global, da Module per Inline eingebunden werden):
  - `window.svShuffle(a) -> a` — Fisher-Yates, mutiert & gibt `a` zurück.
  - `window.svScrollToId(id, block?) -> void` — `getElementById(id)` →
    `scrollIntoView({behavior:"smooth", block: block||"start"})`; No-op wenn
    Element fehlt.
- Consumes: nichts.

> Hinweis: `makeTile` (Wort-Kachel) hängt an phasenspezifischem Markup/State
> (`completed`, `speakWordBySyllables`) und wird **erst in Task 5** (svReader)
> verschoben. Task 1 bewegt nur die zwei reinen Utilities, die überall
> **wortgleich** kopiert sind.

- [ ] **Step 1: Modul anlegen**

Erstelle `shared/reader-util.js`:
```js
/* shared/reader-util.js — kleine, phasenübergreifende Helfer.
   Global: svShuffle, svScrollToId. Reine Utilities ohne DOM-/State-Annahmen. */
(function () {
  // Fisher-Yates: mischt das Array in place und gibt es zurück.
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // Sanft zu einem Element mit gegebener id scrollen (No-op, wenn es fehlt).
  function scrollToId(id, block) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: block || "start" });
  }
  window.svShuffle = shuffle;
  window.svScrollToId = scrollToId;
})();
```

- [ ] **Step 2: In `build.js` registrieren**

Öffne `build.js`, finde die `includes`-Map (Objekt, das Marker-Pfade auf
Dateiinhalte mappt) und ergänze `shared/reader-util.js` analog zu den bestehenden
`shared/*.js`-Einträgen. Prüfe das reale Format:
```bash
grep -nE "srs\.js|celebrate\.js|includes" build.js
```
Trage `"shared/reader-util.js"` im **gleichen Stil** wie `"shared/srs.js"` ein.

- [ ] **Step 3: Marker in allen vier Phasen setzen**

In jeder Phasen-HTML **nach** dem `// #INCLUDE shared/srs.js`-Marker (Phase 1
zusätzlich vor/neben `trace.js`) eine Zeile ergänzen:
```
      // #INCLUDE shared/reader-util.js
```
Exakte Fundstellen der `srs.js`-Marker: Phase1 `:1082`, Phase2 `:865`, Phase3
`:811`, Phase4 `:814` (per `grep -n "#INCLUDE shared/srs.js" phase*/*.html`
gegenprüfen — Zeilen können nach vorherigen Tasks abweichen).

- [ ] **Step 4: Lokale `shuffle`-Kopien entfernen und Aufrufe umstellen**

Ersetze in **allen vier** Phasen die lokale `function shuffle(a) {…}` (Phase1
`:1355-1361`, Phase2 `:890-896`, Phase3 analog, Phase4 `:843-849`) — Funktion
löschen. Ersetze alle Aufrufe `shuffle(` → `svShuffle(` (auch innerhalb von
`svSrsSortDueFirst(shuffle([...`).
```bash
grep -rn "shuffle(" phase*/*.html   # danach dürfen nur noch svShuffle-Treffer bleiben
```

- [ ] **Step 5: Lokale `scrollTo2`/`scrollToLetter`/`scrollToCert` umstellen**

- Phase 2 & 3: `function scrollTo2(id){…}` (Ph2 `:1158-1161`, Ph3 `:1098-1101`)
  löschen; alle `scrollTo2("x")` → `svScrollToId("x")`.
- Phase 4: gleiches `scrollTo2` löschen und Aufrufe ersetzen (per `grep -n
  "scrollTo2" phase4/phase4-schule.html`).
- Phase 1: `scrollToLetter(id)` nutzt Präfix + `block:"center"`. Ersetze den
  Rumpf durch `svScrollToId("letter-" + id, "center")` **oder** ersetze die
  Aufrufe direkt und lösche die Funktion. `scrollToCert()` → Aufrufe durch
  `svScrollToId("certSection")` ersetzen, Funktion löschen.

- [ ] **Step 6: V-BUILD**

Führe **V-BUILD** aus. Erwartet: 4× `OK`, kein `ERR`. Prüfe zusätzlich, dass in
`dist/` **kein** `// #INCLUDE`-Kommentar mehr steht:
```bash
grep -rn "#INCLUDE" dist/phase*/*.html || echo "keine Marker mehr — gut"
```

- [ ] **Step 7: V-TEST**

Führe **V-TEST** aus. Alle Specs grün.

- [ ] **Step 8: V-SNAP (Stichprobe je Phase)** — Nav-Sprünge + ein Quiz-Shuffle
  funktionieren wie in der Baseline.

- [ ] **Step 9: Commit**
```bash
git add shared/reader-util.js build.js phase1 phase2 phase3 phase4
git commit -m "♻️ Refactor: shuffle & scrollToId nach shared/reader-util.js"
```

---

## Task 2: `shared/progress.js` — Fortschritt/Bar/Zertifikat

**Files:**
- Create: `shared/progress.js`
- Modify: `build.js` (`includes`-Map)
- Modify: alle vier Phasen (Marker + lokale Progress-Funktionen ersetzen)

**Interfaces:**
- Consumes: DOM-Elemente `#progressFill`, `#progressLabel`, `#certSection`
  (in jeder Phase vorhanden). Keine JS-Modul-Abhängigkeiten.
- Produces (global):
  - `window.svProgress.init(cfg)` — cfg: `{ key, total, einheit, onRender }`.
    Lädt den Set aus `localStorage[cfg.key]`, merkt sich cfg intern.
  - `window.svProgress.has(id) -> boolean`
  - `window.svProgress.toggle(id) -> void` — togglet, speichert, ruft
    `cfg.onRender()` (die phaseneigene `render()`), aktualisiert danach Bar +
    Zertifikat.
  - `window.svProgress.size() -> number`
  - `window.svProgress.all() -> string[]`
  - `window.svProgress.updateBar() -> void` — schreibt Prozent-Breite + Label
    (`"<done> von <total> <einheit> ⭐"`) und blendet `#certSection` ein/aus.

> **Verhalten fixiert:** Label-Format und Zertifikat-Sichtbarkeit (`done >=
> total`) sind heute in allen Phasen identisch bis auf das Wort (`Buchstaben`
> /​`Wörtern`/​`Sätzen`) — das kommt aus `cfg.einheit`. **Kein** Farm-Sync hier
> (den macht nur `index.html`).

- [ ] **Step 1: Modul anlegen**

Erstelle `shared/progress.js`:
```js
/* shared/progress.js — Fortschritt pro Phase (ein localStorage-Key).
   Global: svProgress.{init,has,toggle,size,all,updateBar}.
   Kapselt Laden/Speichern des Fortschritts-Sets, Progress-Bar-Update und
   Zertifikat-Sichtbarkeit. Kein Farm-Sync (der lebt in index.html). */
(function () {
  let cfg = null;
  let completed = new Set();
  function load(key) {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch (e) {
      return new Set();
    }
  }
  function save() {
    localStorage.setItem(cfg.key, JSON.stringify([...completed]));
  }
  function updateBar() {
    const done = completed.size;
    const total = cfg.total;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const fill = document.getElementById("progressFill");
    const label = document.getElementById("progressLabel");
    const cert = document.getElementById("certSection");
    if (fill) fill.style.width = pct + "%";
    if (label) label.textContent = done + " von " + total + " " + cfg.einheit + " ⭐";
    if (cert) cert.style.display = done >= total ? "block" : "none";
  }
  window.svProgress = {
    init(config) {
      cfg = config;
      completed = load(config.key);
    },
    has(id) { return completed.has(id); },
    size() { return completed.size; },
    all() { return [...completed]; },
    updateBar,
    toggle(id) {
      if (completed.has(id)) completed.delete(id);
      else completed.add(id);
      save();
      if (cfg.onRender) cfg.onRender();
      updateBar();
    },
  };
})();
```

- [ ] **Step 2: In `build.js` registrieren** — `"shared/progress.js"` in die
  `includes`-Map (wie Task 1, Step 2).

- [ ] **Step 3: Marker setzen** — in allen vier Phasen nach dem
  `reader-util.js`-Marker: `// #INCLUDE shared/progress.js`.

- [ ] **Step 4: Phase 2 umstellen** (repräsentativ; 3 & 4 analog)

In `phase2/phase2-schule.html`:
- Lösche `STORAGE_KEY`, `loadProgress`, `let completed = …`, `save`,
  `toggleWord` (`:871-888`).
- Direkt nach den Daten-Arrays (vor `render()`), einmalig initialisieren:
```js
      svProgress.init({
        key: "sv_lesen_phase2_progress",
        total: WORDS.length,
        einheit: "Wörtern",
        onRender: render,
      });
```
- In `render()` den Progress-Block (`done/total/pct/progressFill/progressLabel`,
  `:943-947`) und die Zertifikat-Sichtbarkeit (`:1111`) **entfernen** und durch
  `svProgress.updateBar();` am Ende von `render()` ersetzen. (Die Zertifikat-
  Badges-Befüllung `:1102-1110` bleibt in `render()`.)
- Ersetze **jeden** Zugriff `completed.has(` → `svProgress.has(`,
  `completed.size` → `svProgress.size()`, `toggleWord(` → `svProgress.toggle(`.
```bash
grep -n "completed\.\|toggleWord\|STORAGE_KEY" phase2/phase2-schule.html
```
  Danach dürfen keine Treffer mehr auf `completed.`/`toggleWord`/`STORAGE_KEY`
  bleiben.

- [ ] **Step 5: Phase 3 umstellen** — identisch zu Step 4, aber:
  `key:"sv_lesen_phase3_progress"`, `einheit:"Wörtern"`, `toggleWord` →
  `svProgress.toggle`. Progress-Block in `render()` entfernen →
  `svProgress.updateBar()`.

- [ ] **Step 6: Phase 4 umstellen** — wie Step 4, aber:
  `key:"sv_lesen_phase4_progress"`, `einheit:"Sätzen"`, `toggleSentence(` →
  `svProgress.toggle(`. Lösche `STORAGE_KEY/loadProgress/completed/save/
  toggleSentence` (`:824-841`).

- [ ] **Step 7: Phase 1 umstellen** — wie Step 4, aber:
  `key:"sv_lesen_phase1_progress"`, `total: orderedLetters.length`,
  `einheit:"Buchstaben"`, `toggle(` → `svProgress.toggle(`. Lösche
  `loadProgress/completed/save/toggle` (`:1117-1134`). Prüfe, dass
  `STORAGE_KEY` in Phase 1 korrekt aufgelöst ist (ggf. Konstante oben suchen:
  `grep -n "STORAGE_KEY" phase1/lese-schule.html`) und den Literal-Key
  `"sv_lesen_phase1_progress"` in `init` verwenden.

- [ ] **Step 8: V-BUILD** — 4× `OK`, keine `#INCLUDE`-Reste in `dist/`.

- [ ] **Step 9: V-TEST** — alle grün. Besonders die `progress`-Spec beachten.

- [ ] **Step 10: V-SNAP** — für **alle vier** Phasen den Fortschritts-Punkt (1)
  aus V-SNAP durchspielen: markieren → Bar/Label → Reload persistiert → alle →
  Zertifikat. **Erwartete Abweichung:** keine.

- [ ] **Step 11: Commit**
```bash
git add shared/progress.js build.js phase1 phase2 phase3 phase4
git commit -m "♻️ Refactor: Fortschritt/Bar/Zertifikat nach shared/progress.js"
```

---

## Task 3: `shared/speak-text.js` — Sprach-Helfer

**Files:**
- Create: `shared/speak-text.js`
- Modify: `build.js`, alle vier Phasen.

**Interfaces:**
- Consumes: `window.speak(text, baseRate)`, `saySyllable(syl)` aus
  `voice-picker.js`.
- Produces (global):
  - `window.svSay.word(text, rate?) -> void` — `speak(String(text).toLowerCase(),
    rate || 0.85)`.
  - `window.svSay.renderSyllables(container, silbenArr) -> void` — baut
    `.syl`-Spans mit `·`-Trennern (wie Phase 2 `:899-913`).
  - `window.svSay.bySyllables(silbenArr, wordText, sylSpans?, opts?) -> void` —
    silbenweise sprechen mit `.lit`-Highlight, dann flüssiges Wort; `opts.step`
    Default 620 ms, `opts.tail` Default 120 ms, `opts.rate` Default 0.85.
    Einsilbige Wörter (`silbenArr.length <= 1`) werden **nur einmal als Ganzes**
    gesprochen (kurzer `.lit`-Blitz), nicht Silbe + Wort doppelt (aus Phase 3).
  - `window.svSay.line(spans, words, done?) -> void` — Phase-4-Variante:
    Wort-für-Wort mit `.lit`, dann ganzer Satz (`speak(words.join(" ")…, 0.85)`),
    Timing 720/160 ms.

> **Vereinheitlichung (erwartete Abweichung):** Heute nutzen Phase 2/3
> `speakWordBySyllables` mit Timing 620/120 und `sayWord`-Rate 0.85, Phase 4
> `speakLineByWords` mit 720/160 und `sayWord`-Rate 0.8. Diese phasen-relativen
> Tempi bleiben über die Parameter erhalten (Phase 4 ruft mit eigenem
> `rate`/Timing auf). Phase 3 behandelt zusätzlich **einsilbige Wörter** gesondert
> (einmal als Ganzes statt Silbe + Wort) — dieser Kurzschluss wird in
> `bySyllables` übernommen, sodass Ph2 (mehrsilbig) und Ph3 (auch einsilbig)
> jeweils wie bisher klingen. **Kein hörbarer Unterschied** gegenüber Baseline.

- [ ] **Step 1: Modul anlegen**
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
    // Einsilbige (kurze) Wörter: nur einmal als Ganzes sprechen (aus Ph3).
    if (silben.length <= 1) {
      if (sylSpans && sylSpans[0]) {
        sylSpans[0].classList.add("lit");
        setTimeout(() => sylSpans[0].classList.remove("lit"), 700);
      }
      word(wordText, rate);
      return;
    }
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

- [ ] **Step 2: `build.js` registrieren** + **Step 3: Marker** nach
  `progress.js` in allen vier Phasen (`// #INCLUDE shared/speak-text.js`).

- [ ] **Step 4: Phase 2 umstellen**
- Lösche `sayWord` (`:866-868`), `renderSyllables` (`:899-913`),
  `speakWordBySyllables` (`:916-933`).
- Ersetze Aufrufe: `sayWord(x)` → `svSay.word(x, 0.85)`; `renderSyllables(c, w)`
  → `svSay.renderSyllables(c, w.silben)`; `speakWordBySyllables(w, spans)` →
  `svSay.bySyllables(w.silben, w.id, spans)`; für `speakWordBySyllables(w, null)`
  → `svSay.bySyllables(w.silben, w.id, null)`.
```bash
grep -n "sayWord\|renderSyllables\|speakWordBySyllables" phase2/phase2-schule.html
```

- [ ] **Step 5: Phase 3 umstellen** — identisch zu Step 4 (Phase 3 hat dieselben
  drei Funktionen + `sayWord`-Rate 0.85; per `grep` verifizieren).

- [ ] **Step 6: Phase 4 umstellen**
- Lösche `sayWord` (`:816-818`), `saySentence` (`:819-821`), `speakLineByWords`
  (`:900-918`). `renderSentenceLine`/`flashLit` **bleiben** (phasenspezifisch,
  kommen in Task 5).
- Ersetze `sayWord(w)` → `svSay.word(w, 0.8)`; `saySentence(words)` →
  `svSay.word(words.join(" "), 0.85)`; `speakLineByWords(spans, words, done)` →
  `svSay.line(spans, words, done)`.

- [ ] **Step 7: Phase 1 prüfen** — Phase 1 nutzt für Buchstaben `speak(spokenWord(
  l.merkwort))` **direkt** (kein `sayWord`), und `saySyllable` für Silben-Chips.
  Das bleibt **unverändert** — Phase 1 hat keine `speakWordBySyllables`-Nutzung
  im Buchstaben-Teil. **Nur** falls die Lese-Werkstatt (`blendWord`, ab `:1515`)
  eine eigene Silben-Sprech-Logik hat, unangetastet lassen (gehört zu Task 4/kein
  Ziel hier). Ergebnis: Phase 1 bekommt in diesem Task **keine** Änderung außer
  dem gesetzten Marker (den Marker trotzdem setzen, damit `svSay` verfügbar ist,
  falls Task 4 ihn braucht) — oder Marker erst in Task 4 setzen. Entscheide dich
  für **Marker jetzt setzen, Code unverändert**.

- [ ] **Step 8: V-BUILD** → **Step 9: V-TEST** → **Step 10: V-SNAP** (Audio-Punkt
  (2) für Phase 2/3/4; Highlight-Timing muss sich wie Baseline anfühlen).

- [ ] **Step 11: Commit**
```bash
git add shared/speak-text.js build.js phase1 phase2 phase3 phase4
git commit -m "♻️ Refactor: Sprach-Helfer nach shared/speak-text.js"
```

---

## Task 4: `shared/exercises.js` — Blitz-Karten (Flashcards) vereinheitlichen

> **Scope-Entscheidung:** Die drei „Übungsmodi" der Phasen sind **nicht** alle
> gleich genug, um sie ohne Verhaltensänderung zu einer Engine zu verschmelzen:
> Phase 1 Quiz = Aufdecken/Selbsteinschätzung, Phase 3 = Bild-Multiple-Choice,
> Phase 4 = Wort-Multiple-Choice, Phase 2/4 = Silben-/Satz-Bauer. Sie **eins zu
> eins** zu vereinheitlichen würde das Verhalten spürbar ändern (über „klein"
> hinaus). **Deshalb** vereinheitlicht dieser Task nur den **wirklich
> identischen** Modus: die **Blitz-Karten** (Flashcards), die in Phase 2 & 3
> zeichengleich kopiert sind. Quiz/Builder bleiben vorerst pro Phase (siehe
> „Nicht im Scope" am Ende — bewusste YAGNI-Grenze).

**Files:**
- Create: `shared/exercises.js`
- Modify: `build.js`, `phase2/phase2-schule.html`, `phase3/phase3-schule.html`.

**Interfaces:**
- Consumes: `window.svShuffle`, `window.svSay.word`.
- Produces (global):
  - `window.svFlash.mount(cfg) -> void` — cfg:
    `{ items, elIds, wordKey, emojiKey, rate? }` (`rate` Default 0.85) mit
    `elIds = { stars, total, index, card, word, emoji }`. Baut ein eigenes Deck
    (`svShuffle([...items])`), rendert die aktuelle Karte, verdrahtet nichts an
    Buttons (die Buttons rufen weiterhin `svFlash.read/flip/next` global auf).
  - `window.svFlash.read()`, `window.svFlash.flip()`, `window.svFlash.next()`.

> Beleg der Gleichheit: Phase 2 `:1274-1326` und Phase 3 `:1195-1247` sind bis
> auf Whitespace identisch (`fDeck/fIdx/fStars/fFlipped`, `startFlash/renderFlash/
> flashRead/flashFlip/flashNext`, Element-IDs `fStars/fTotal/fIndex/fCard/fWord/
> fEmoji`). **Erwartete Abweichung:** keine.

- [ ] **Step 1: HTML-IDs beider Phasen abgleichen**

Bestätige, dass beide Phasen exakt die IDs `fStars,fTotal,fIndex,fCard,fWord,
fEmoji` und die onclick-Verdrahtung der Blitz-Buttons nutzen:
```bash
grep -n "fStars\|fTotal\|fIndex\|fCard\|fWord\|fEmoji\|flashRead\|flashFlip\|flashNext" phase2/phase2-schule.html phase3/phase3-schule.html
```
Weichen IDs ab, STOPP und melde — dann ist die Vereinheitlichung nicht
verhaltensneutral.

- [ ] **Step 2: Modul anlegen**
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

> **Achtung Sprech-Rate:** Phase 2 & 3 nutzen heute `sayWord` mit Rate 0.85
> bzw. 0.8. Prüfe in Step 1 die realen Raten (`grep -n "function sayWord"` bzw.
> nach Task 3 die `svSay.word(..., RATE)`-Aufrufe). `svFlash` reicht die Rate
> bereits über `cfg.rate` (Default 0.85) an `read`/`flip` durch — weicht eine
> Phase davon ab (z. B. Phase 3 = 0.8), im `mount(...)`-Aufruf `rate: 0.8`
> mitgeben statt den Wert hart zu setzen.
> **Verhaltensneutralität hat Vorrang** vor Vereinheitlichung der Rate.

- [ ] **Step 3: `build.js` registrieren** + **Marker** nach `speak-text.js` in
  Phase 2 & 3.

- [ ] **Step 4: Phase 2 umstellen**
- Lösche `fDeck/fIdx/fStars/fFlipped` + `startFlash/renderFlash/flashRead/
  flashFlip/flashNext` (`:1274-1326`).
- Ersetze den Start-Aufruf `startFlash();` (`:1331`) durch:
```js
      svFlash.mount({
        items: WORDS, wordKey: "id", emojiKey: "emoji",
        elIds: { stars: "fStars", total: "fTotal", index: "fIndex",
                 card: "fCard", word: "fWord", emoji: "fEmoji" },
      });
```
- Stelle die Blitz-Button-`onclick`/Listener von `flashRead/flashFlip/flashNext`
  auf `svFlash.read()/svFlash.flip()/svFlash.next()` um. Finde sie:
```bash
grep -n "flashRead\|flashFlip\|flashNext" phase2/phase2-schule.html
```
  (Können in inline `onclick`-Attributen im HTML-Body **oder** als
  `addEventListener` im Script stehen — beide Fundstellen umstellen.)

- [ ] **Step 5: Phase 3 umstellen** — identisch zu Step 4, Start-Aufruf
  `startFlash();` (`:1252`) ersetzen, `:1195-1247` löschen, Buttons umstellen.

- [ ] **Step 6: V-BUILD** → **Step 7: V-TEST** → **Step 8: V-SNAP** — Blitz-Modus
  in Phase 2 & 3: Karte umdrehen (spricht Wort), Weiter zählt ⭐, Ende zeigt 🏆.

- [ ] **Step 9: Commit**
```bash
git add shared/exercises.js build.js phase2 phase3
git commit -m "♻️ Refactor: Blitz-Karten nach shared/exercises.js (svFlash)"
```

---

## Task 5: `shared/reader.js` — Wort-Kachel-Fabrik (`svReader.makeWordTile`)

> Vereinheitlicht die in Phase 2 & 3 nahezu identische `makeWordTile` (Phase 2
> `:1114-1156`, Phase 3 analog). Phase 4 (`makeSentenceTile`) und Phase 1
> (Buchstaben-Karte) haben abweichendes Layout und bleiben **phasenspezifisch**
> (bewusste Grenze — nur der echte Zwilling Ph2/Ph3 wird geteilt).

**Files:**
- Create: `shared/reader.js`
- Modify: `build.js`, `phase2/phase2-schule.html`, `phase3/phase3-schule.html`.

**Interfaces:**
- Consumes: `window.svProgress.{has,toggle}`, `window.svSay.{renderSyllables,
  bySyllables}`.
- Produces (global):
  - `window.svReader.makeWordTile(w, opts) -> HTMLElement` — opts:
    `{ hearLabel, doneLabelOn, doneLabelOff, showBezug }`. Baut die
    `.word-tile` inkl. Emoji, Silben, „🔊"-Zeile, optionalem `.word-bezug`
    (aus `w.bezug` via DOMParser) und „Kann ich"-Button (`svProgress.toggle`).

- [ ] **Step 1: Vergleich bestätigen**
```bash
diff <(sed -n '1114,1156p' phase2/phase2-schule.html) <(grep -n "function makeWordTile" -A42 phase3/phase3-schule.html | sed 's/^[0-9-]*[:-]//')
```
Notiere Unterschiede (z. B. hat Phase 3 evtl. `kat`-Badges oder kein `bezug`).
Nur die gemeinsamen Teile teilen; abweichende Teile über `opts` steuerbar machen.

- [ ] **Step 2: Modul anlegen** — übernimm die Phase-2-`makeWordTile` (`:1114-1156`)
  1:1, ersetze `completed.has` → `svProgress.has`, `toggleWord` →
  `svProgress.toggle`, `renderSyllables(syll, w)` → `svSay.renderSyllables(syll,
  w.silben)`, `speakWordBySyllables(w, spans())` → `svSay.bySyllables(w.silben,
  w.id, spans())`. Mache den `.word-bezug`-Block **bedingt** (`if (opts.showBezug
  && w.bezug)`), da Phase 3 evtl. kein `bezug` hat. Labels aus `opts`.
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

- [ ] **Step 3: `build.js` registrieren** + **Marker** nach `exercises.js` in
  Phase 2 & 3.

- [ ] **Step 4: Phase 2 umstellen** — `function makeWordTile` (`:1114-1156`)
  löschen; Aufruf `makeWordTile(w)` (`:1080`) →
  `svReader.makeWordTile(w, { showBezug: true })`.

- [ ] **Step 5: Phase 3 umstellen** — `makeWordTile` löschen; Aufruf ersetzen.
  `showBezug` nur setzen, wenn Phase 3 `bezug` hat (aus Step 1). Falls Phase 3
  zusätzliche Elemente (z. B. Kategorie-Badge) in der Kachel hatte, diese im
  Aufruf-Kontext **nach** `svReader.makeWordTile(...)` an das zurückgegebene
  Element anhängen — nicht ins geteilte Modul ziehen.

- [ ] **Step 6: V-BUILD** → **Step 7: V-TEST** → **Step 8: V-SNAP** — Wort-Kacheln
  in Phase 2 & 3: Emoji/Silben sprechen, „Kann ich" togglet + persistiert,
  Layout identisch zur Baseline (inkl. Dark Mode).

- [ ] **Step 9: Commit**
```bash
git add shared/reader.js build.js phase2 phase3
git commit -m "♻️ Refactor: Wort-Kachel nach shared/reader.js (svReader.makeWordTile)"
```

---

## Task 6: HTML-Chrome — Doku statt Extraktion prüfen

> Header/Sticky-Nav/Eltern-Panel/Zertifikat sind **Markup**, das pro Phase in den
> `<body>` gehört und über `render()` teils dynamisch befüllt wird. Ein
> HTML-`#INCLUDE` lohnt nur, wenn die Blöcke **wirklich statisch & identisch**
> sind. Dieser Task **prüft** das und extrahiert nur, was risikolos geht.

**Files:** ggf. `shared/chrome-*.html`, `build.js`, Phasen — **nur** falls Step 1
einen echten identischen Block findet.

- [ ] **Step 1: Statische Chrome-Blöcke vergleichen**

Vergleiche in den vier Phasen die statischen Teile des `<body>` **vor**
`<script>` (Header mit Holz-Bordüre, `.voice-wrap`, Progress-Bar-Gerüst,
`#navRow`-Container, `#certSection`-Hülle):
```bash
for f in phase1/lese-schule.html phase2/phase2-schule.html phase3/phase3-schule.html phase4/phase4-schule.html; do echo "=== $f ==="; sed -n '/<body>/,/<script>/p' "$f" | head -60; done
```
Markiere Blöcke, die **zeichengleich** sind (typischer Kandidat: die
`.voice-wrap`/Stimmen-Picker-Hülle, der Back-Link `← Übersicht`, das
Progress-Bar-Gerüst).

- [ ] **Step 2: Nur identische Blöcke extrahieren**

Für jeden zeichengleichen Block: nach `shared/chrome-<name>.html` auslagern,
`<!-- #INCLUDE shared/chrome-<name>.html -->` an der Stelle setzen, in `build.js`
registrieren. **Abweichende** Blöcke (unterschiedliche Titel, Emojis, Einheit)
**nicht** anfassen. Findet Step 1 keine wirklich identischen Blöcke, ist dieser
Task ein reiner Prüf-Task ohne Code-Änderung — dann Step 3–4 überspringen und in
Step 5 einen leeren Commit mit Begründung machen.

- [ ] **Step 3: V-BUILD** — 4× `OK`, keine `#INCLUDE`-Reste in `dist/`.

- [ ] **Step 4: V-TEST** — besonders `structure`- und `a11y`-Specs (Back-Link,
  `aria-label`, Header vorhanden).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "♻️ Refactor: identische Chrome-Blöcke nach shared/ (oder: geprüft, keine risikolose Extraktion)"
```

---

## Task 7: Abschluss — Cache-Bump, Gesamtlauf, Doku

**Files:** `sw.js`, `CLAUDE.md` (Abschnitt „Geteilte Bausteine"), `README.md`
(falls Modul-Liste dort steht).

- [ ] **Step 1: `CACHE_VERSION` erhöhen**

In `sw.js` `CACHE_VERSION` von `sv-lesen-v6` auf `sv-lesen-v7` setzen:
```bash
grep -n "CACHE_VERSION" sw.js
```
Neue `shared/*.js`-Dateien brauchen **keinen** `APP_SHELL`-Eintrag (sie werden
inlined; nur ganze Seiten stehen in `APP_SHELL`) — prüfe das trotzdem gegen die
Liste.

- [ ] **Step 2: Doku nachziehen**

In `CLAUDE.md`, Abschnitt „Geteilte Bausteine (`shared/`)", die neuen Module
ergänzen (je 1 Zeile, Stil wie bestehende Einträge):
`reader-util.js` (svShuffle/svScrollToId), `progress.js` (svProgress.*),
`speak-text.js` (svSay.*), `exercises.js` (svFlash.*), `reader.js`
(svReader.makeWordTile) — plus etwaige `chrome-*.html` aus Task 6.
Falls `README.md` eine Modul-/Dateiliste führt, dort analog ergänzen.

- [ ] **Step 3: Voller Verifikationslauf**

**V-BUILD** + **V-TEST** komplett. Zusätzlich Zeilen-Reduktion belegen:
```bash
for f in phase1/lese-schule.html phase2/phase2-schule.html phase3/phase3-schule.html phase4/phase4-schule.html; do echo "$(wc -l < "$f") $f"; done
```
Erwartet: jede Phase deutlich kürzer als die Ausgangswerte (Ph1 1670, Ph2 1337,
Ph3 1258, Ph4 1374).

- [ ] **Step 4: Voller V-SNAP über alle vier Phasen** — komplette Checkliste (1)–(4)
  je Phase. Jede bewusste Abweichung gegen die Task-0-Notiz abgleichen; es darf
  **nur** die in Task 4/5 markierten (keine hörbaren/sichtbaren) geben.

- [ ] **Step 5: Commit**
```bash
git add sw.js CLAUDE.md README.md
git commit -m "🔧 Refactor-Abschluss: CACHE_VERSION v6→v7 + Doku der neuen shared/-Module"
```

- [ ] **Step 6: Zusammenführen**

Branch ist fertig. Übergib an den Nutzer für Review + Merge nach `master`
(Fast-Forward), gemäß dem Wellen-Workflow. **Nicht** eigenmächtig nach `master`
mergen.

---

## Self-Review (vom Plan-Autor bereits geprüft)

- **Spec-Abdeckung:** Duplizierung reduzieren (Tasks 1–5), Übungs-Logik
  vereinheitlichen (Task 4, bewusst auf Blitz-Karten begrenzt — Begründung im
  Task), Dateien verkleinern (Task 7 Step 3 belegt Reduktion), Build/Struktur
  (jeder Task pflegt `build.js`). Chrome-Extraktion (Task 6) bewusst als
  Prüf-Task, weil dynamisch befülltes Markup nicht risikolos statisch teilbar ist.
- **Erwartete Abweichungen** sind pro Task markiert; „keine" wo verhaltensneutral.
- **Kein Farm-Sync in `progress.js`** (nur `index.html` synct) — korrekt gegen
  den Ist-Code abgeglichen.

## Nicht im Scope (bewusste YAGNI-Grenze)

- **Quiz/Builder-Vereinheitlichung** (Phase 1 Aufdeck-Quiz, Phase 3 Bild-Quiz,
  Phase 4 Wort-Quiz, Phase 2 Silben-Bauer, Phase 4 Satz-Bauer): pädagogisch
  verschieden; eine Verschmelzung überschritte „kleine Vereinheitlichung". Kann
  später als eigener Plan folgen, sobald `svFlash` sich bewährt hat.
- **`index.html`** wird nur in Task 7 dokumentarisch berührt; sein
  aggregierendes (read-only) Fortschrittsmodell unterscheidet sich vom
  schreibenden `svProgress` der Phasen und bleibt eigenständig.
- **Voll datengetriebene Single-Engine** (Phasen-als-Manifest) — bewusst nicht;
  die Modul-Verträge lassen die spätere Annäherung offen.
- Keine Änderung an Druckversionen, Lehrplan, `trace.js`-Werkstatt, Audio-Engine.
