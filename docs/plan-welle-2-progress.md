# Welle 2 — `shared/progress.js` (`svProgress.*`) — Ausführungsplan

> **Status:** Entwurf (vor Umsetzung).
> **Für agentische Worker:** REQUIRED SUB-SKILL `superpowers:executing-plans`.
> Checkbox-Syntax (`- [ ]`). Welle endet mit grünem Build **und** Tests **und
> eigenem Commit**. Mapping & Abhängigkeiten:
> `docs/refactoring-shared-engine-wellen-index.md`.

**Quelle & Einordnung**

- **Primär (Wie?):** `docs/plan-refactoring-shared-engine.md` → **Task 2**.
- **Architektur (Warum?):** Design-Spec → **Schritt 2** (Fortschritt/Bar/Zertifikat).
- **Rolle:** Sensibelster State (`localStorage`-Fortschritt je Phase). Früh und
  isoliert, mit fixiertem Key-/ID-Schema. **Abhängig von Welle 1** (stabiler
  Stand + `svShuffle`-Konvention). Liefert `svProgress` für Welle 5 (`makeWordTile`).

**Ziel:** Die pro Phase duplizierte Fortschritts-Logik (`loadProgress`/`save`/
`toggle*`, Progress-Bar-Update, Zertifikat-Freischaltung) in `shared/progress.js`
konsolidieren. Sichtbares Verhalten bleibt unverändert.

**Tech-Stack:** Vanilla JS (IIFE), `localStorage`, Playwright.

> **Verhalten fixiert:** Label-Format und Zertifikat-Sichtbarkeit (`done >= total`)
> sind heute in allen Phasen identisch bis auf das Einheits-Wort
> (`Buchstaben`/`Wörtern`/`Sätzen`) — kommt aus `cfg.einheit`. **Kein** Farm-Sync
> hier (den macht nur `index.html`).

## Gemeinsame Vorgaben (Kurzform — volle Fassung im Masterplan)

Gegen `dist/` prüfen · `node build.js` vor jeder Prüfung · Shared-Block **dreifach**
registrieren · Engine-Module **nach** `voice-picker`/`celebrate`/`srs` · keine neuen
`localStorage`-Keys · Sprech-Texte kleinschreiben · Deutsch+Emoji bei Texten/Kommentaren/Commits ·
nicht auf `master` ohne Branch · keine Änderung an Druckversionen/Lehrplan/bestehenden Shared-Bausteinen.

## Verifikations-Kommandos

```
V-BUILD:  node build.js  + JS-Syntax-Check über alle 4 gebauten Phasen (Snippet s. Masterplan); danach grep -rn "#INCLUDE" dist/phase*/*.html  ( muss leer sein )
V-TEST:   cd tests && npx playwright test
V-SNAP:   manuelle Checkliste (Fortschritt · Audio · Übungen · Dark Mode/Responsive); Volltext + Baseline im Masterplan/Task 0
```

## Datei-Struktur

- **Create:** `shared/progress.js`
- **Modify:** `build.js` (`includes`-Map)
- **Modify:** alle vier Phasen (Marker + lokale Progress-Funktionen ersetzen + Aufrufe umstellen)

## Modul-Verträge

- **Consumes:** DOM-Elemente `#progressFill`, `#progressLabel`, `#certSection`
  (in jeder Phase vorhanden).
- **Produces (global):**
  - `window.svProgress.init(cfg)` — `cfg = { key, total, einheit, onRender }`.
    Lädt das Set aus `localStorage[cfg.key]`, merkt sich `cfg` intern.
  - `window.svProgress.has(id) -> boolean`
  - `window.svProgress.toggle(id) -> void` — togglet, speichert, ruft
    `cfg.onRender()` (die phaseneigene `render()`), danach Bar + Zertifikat.
  - `window.svProgress.size() -> number`
  - `window.svProgress.all() -> string[]`
  - `window.svProgress.updateBar() -> void` — Prozent-Breite + Label
    (`"<done> von <total> <einheit> ⭐"`) und `#certSection` ein/aus.

> **Sicherheits-Eigenschaft:** `progress.js` ist ab dieser Welle der **einzige**
> Schreibzugriff auf den Fortschritts-Key. Nach dem Umbenennen aller Zugriffe
> darf in keiner Phase mehr direkt `localStorage[…_progress]` gelesen/geschrieben
> werden (per `grep` verifizieren).

---

### Task 2: `shared/progress.js`

- [ ] **Step 2.1: Modul anlegen** — erstelle `shared/progress.js`:

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

- [ ] **Step 2.2: In `build.js` registrieren** — `"shared/progress.js": loadShared("progress.js"),`
  in die `includes`-Map (Stil wie `reader-util.js` aus Welle 1).

- [ ] **Step 2.3: Marker setzen** — in allen vier Phasen **nach** dem
  `reader-util.js`-Marker: `// #INCLUDE shared/progress.js`.

- [ ] **Step 2.4: Phase 2 umstellen** (repräsentativ; 3 & 4 analog)
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
  `svProgress.updateBar();` am Ende von `render()` ersetzen. (Die
  Zertifikat-Badges-Befüllung `:1102-1110` bleibt in `render()`.)
- **Jeden** Zugriff umstellen: `completed.has(` → `svProgress.has(`,
  `completed.size` → `svProgress.size()`, `toggleWord(` → `svProgress.toggle(`:

```bash
grep -n "completed\.\|toggleWord\|STORAGE_KEY" phase2/phase2-schule.html
```

  Danach dürfen keine Treffer auf `completed.`/`toggleWord`/`STORAGE_KEY` bleiben.

- [ ] **Step 2.5: Phase 3 umstellen** — identisch zu 2.4, aber
  `key:"sv_lesen_phase3_progress"`, `einheit:"Wörtern"`, `toggleWord` →
  `svProgress.toggle`. Progress-Block in `render()` entfernen →
  `svProgress.updateBar()`.

- [ ] **Step 2.6: Phase 4 umstellen** — wie 2.4, aber
  `key:"sv_lesen_phase4_progress"`, `einheit:"Sätzen"`, `toggleSentence(` →
  `svProgress.toggle(`. Lösche `STORAGE_KEY/loadProgress/completed/save/
  toggleSentence` (`:824-841`).

- [ ] **Step 2.7: Phase 1 umstellen** — wie 2.4, aber
  `key:"sv_lesen_phase1_progress"`, `total: orderedLetters.length`,
  `einheit:"Buchstaben"`, `toggle(` → `svProgress.toggle(`. Lösche
  `loadProgress/completed/save/toggle` (`:1117-1134`). `STORAGE_KEY` in Phase 1
  auflösen (`grep -n "STORAGE_KEY" phase1/lese-schule.html`) und den Literal-Key
  `"sv_lesen_phase1_progress"` in `init` verwenden.

## Verifikation dieser Welle

- [ ] **Step V.1: V-BUILD** — 4× `OK`, kein `ERR`, keine `#INCLUDE`-Reste in `dist/`.
- [ ] **Step V.2: Einziger Key-Zugriff** — `grep -rn "sv_lesen_phase._progress"
  phase*/*.html` darf nur noch in `svProgress.init({...})`-Aufrufen auftauchen,
  nirgendwo als direkter `localStorage`-Zugriff.
- [ ] **Step V.3: V-TEST** — alle grün, besonders die `progress`-Spec.
- [ ] **Step V.4: V-SNAP für alle vier Phasen** — Punkt (1) Fortschritt komplett
  durchspielen: markieren → Bar/Label → Reload persistiert → alle → Zertifikat.

## Erwartete Abweichung

**Keine.** Keys, IDs, Label-Format und Zertifikat-Logik bleiben 1:1.

## Commit

```bash
git add shared/progress.js build.js phase1 phase2 phase3 phase4
git commit -m "♻️ Refactor: Fortschritt/Bar/Zertifikat nach shared/progress.js"
```

## Übergabe / Nächste Welle

Nach Merge: **Welle 3** (`shared/speak-text.js`) ist unabhängig von dieser Welle,
kann auch parallel/als Nächstes kommen. **Welle 5** (`makeWordTile`) benötigt
`svProgress.has/toggle` aus *dieser* Welle.
