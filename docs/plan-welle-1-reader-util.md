# Welle 1 — `shared/reader-util.js` (`svShuffle`, `svScrollToId`) — Ausführungsplan

> **Status:** 🔧 Umgesetzt auf Branch `refactor/shared-engine` (Commits `54cb469` „Refactor-Start" + `8763c1d` „shuffle & scrollToId …"). V-BUILD: 4× OK, keine `#INCLUDE`-Reste. V-TEST: **160 passed**. **Offen:** V-SNAP (manuelle Verhaltens-Checkliste, durch Nutzer im Browser) + Fast-Forward nach `master`.
> **Für agentische Worker:** REQUIRED SUB-SKILL `superpowers:executing-plans`
> (oder `superpowers:subagent-driven-development`). Schritte nutzen
> Checkbox-Syntax (`- [ ]`). Jeder Schritt grün = nächster Schritt. Welle endet
> mit grünem Build **und** grünen Playwright-Tests **und einem eigenen Commit**.
> Mapping & Abhängigkeiten: siehe `docs/refactoring-shared-engine-wellen-index.md`.

**Quelle & Einordnung**

- **Primär (Wie?):** `docs/plan-refactoring-shared-engine.md` → **Task 1**
  (+ **Task 0** = einmalige Vorbereitung, nur in *dieser* Welle).
- **Architektur (Warum?):** `docs/superpowers/specs/2026-07-21-refactoring-shared-engine-design.md`
  → **Schritt 1** (Teil: `shuffle`/`scrollTo`).
- **Rolle:** Kleinster, risikoärmster Anfang. Liefert die reinen Helfer, auf die
  jede Folge-Welle aufbaut (Welle 4/5 nutzen `svShuffle`). **Erste Welle** des
  Refaktors → richtet Branch + Baseline ein.

**Ziel:** Die in allen vier Phasen **wortgleich** kopierten reinen Utilities
`shuffle` und die `scrollTo*`-Helfer in ein neues `shared/reader-util.js` heben
und lokal löschen. Sichtbares Verhalten bleibt unverändert.

> **Wichtig (Scope):** `makeTile`/`makeWordTile` hängt an phasenspezifischem
> Markup/State und wird **erst in Welle 5** (`svReader`) bewegt. Diese Welle
> bewegt **nur** die zwei reinen Utilities.

**Tech-Stack:** Vanilla JS (ES2020, IIFE-Modul), Node-Build, Playwright.

---

## Gemeinsame Vorgaben (Kurzform — volle Fassung im Masterplan)

Immer gegen `dist/` prüfen, nie gegen Source · `node build.js` vor jeder Prüfung ·
neuen Shared-Block **dreifach** registrieren (Datei · `#INCLUDE`-Marker ·
`build.js` `includes`-Map) · Engine-Module **nach** `voice-picker`/`celebrate`/`srs`
einbinden · keine neuen `localStorage`-Keys · Sprech-Texte kleinschreiben ·
Nutzertexte/Kommentare/Commits Deutsch mit Emoji-Präfix · nicht auf `master`
ohne Branch · keine Änderung an Druckversionen/Lehrplan/bestehenden Shared-Bausteinen.

## Verifikations-Kommandos

**V-BUILD** — Build + JS-Syntax-Check aller vier gebauten Phasen:

```bash
node build.js
node -e 'const fs=require("fs");["dist/phase1/lese-schule.html","dist/phase2/phase2-schule.html","dist/phase3/phase3-schule.html","dist/phase4/phase4-schule.html"].forEach(f=>{const h=fs.readFileSync(f,"utf8");[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new Function(m[1])}catch(e){console.log("ERR",f,"script#"+i,e.message);process.exit(1)}});console.log("OK",f)})'
```

Erwartet: 4× `OK …`, kein `ERR`. Zusätzlich **kein** `// #INCLUDE`-Rest in `dist/`:

```bash
grep -rn "#INCLUDE" dist/phase*/*.html || echo "keine Marker mehr — gut"
```

**V-TEST** — Playwright-Suite (`ConnectionAbortedError`-Zeilen = harmlos):

```bash
cd tests && npx playwright test
```

(Einmalig: `cd tests && npm ci && npx playwright install chromium`.) Erwartet:
alle Specs grün (a11y, navigation, progress, pwa, responsive, structure).

**V-SNAP** — manuelle Verhaltens-Checkliste (s. Vorbereitung Step 3).

---

## Datei-Struktur

- **Create:** `shared/reader-util.js`
- **Modify:** `build.js` (`includes`-Map)
- **Modify:** alle vier Phasen — `phase1/lese-schule.html`,
  `phase2/phase2-schule.html`, `phase3/phase3-schule.html`,
  `phase4/phase4-schule.html` (Marker + lokale Kopien entfernen + Aufrufe umstellen)

## Modul-Verträge

- **Consumes:** nichts.
- **Produces (global):**
  - `window.svShuffle(a) -> a` — Fisher-Yates, mischt in place, gibt `a` zurück.
  - `window.svScrollToId(id, block?) -> void` — `getElementById(id)` →
    `scrollIntoView({behavior:"smooth", block: block||"start"})`; No-op wenn fehlt.

---

## Vorbereitung (einmalig — Masterplan Task 0; **nur in dieser Welle**)

- [ ] **Step 0.1: Feature-Branch anlegen**

```bash
git checkout master && git pull
git checkout -b refactor/shared-engine
```

- [ ] **Step 0.2: Ausgangs-Build & Tests grün bestätigen**
Führe **V-BUILD** und **V-TEST** aus. Beide müssen **vor** jeder Änderung grün
sein. Sind sie es nicht: STOPP und zurückmelden — dann ist die Baseline kaputt
und Regressionen wären nicht unterscheidbar.

- [ ] **Step 0.3: Verhaltens-Baseline notieren (V-SNAP)**
Öffne alle vier `dist/…html` und arbeite die V-SNAP-Checkliste einmal pro Phase
ab. Notiere pro Phase das Ist-Verhalten (v. a. Übungs-Bedienung: Ph1 Quiz =
„aufdecken & selbst einschätzen"; Ph2 = Silben-Bauer + Blitz; Ph3 = Bild-Quiz
mit 3 Antwort-Buttons + Blitz; Ph4 = Satz-Bauer + Wort-Quiz). Diese Notiz ist
die Referenz für „erwartete Abweichung" in späteren Wellen.

- [ ] **Step 0.4: leerer Marker-Commit als Branch-Start**

```bash
git commit --allow-empty -m "🔧 Refactor-Start: Baseline shared-engine (Build+Tests grün)"
```

---

### Task 1: `shared/reader-util.js`

- [ ] **Step 1.1: Modul anlegen** — erstelle `shared/reader-util.js`:

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

- [ ] **Step 1.2: In `build.js` registrieren**
Öffne `build.js`, finde die `includes`-Map (ab Zeile ~24, Format:
`"shared/srs.js": loadShared("srs.js"),`). Ergänze im gleichen Stil:

```js
  "shared/reader-util.js": loadShared("reader-util.js"),
```

Gegenprüfen: `grep -nE "srs\.js|reader-util" build.js`.

- [ ] **Step 1.3: Marker in allen vier Phasen setzen**
In jeder Phasen-HTML **nach** dem `// #INCLUDE shared/srs.js`-Marker eine Zeile:

```
      // #INCLUDE shared/reader-util.js
```

Anker (per `grep -n "#INCLUDE shared/srs.js" phase*/*.html` gegenprüfen — Zahlen
können abweichen): Phase1 `:1082`, Phase2 `:865`, Phase3 `:811`, Phase4 `:814`.

- [ ] **Step 1.4: Lokale `shuffle`-Kopien entfernen und Aufrufe umstellen**
Lösche in **allen vier** Phasen die lokale `function shuffle(a) {…}` (Ph1
`:1355-1361`, Ph2 `:890-896`, Ph3 analog, Ph4 `:843-849`). Ersetze **jeden**
Aufruf `shuffle(` → `svShuffle(` (auch in `svSrsSortDueFirst(shuffle([...`):

```bash
grep -rn "shuffle(" phase*/*.html   # danach dürfen nur noch svShuffle-Treffer bleiben
```

- [ ] **Step 1.5: `scrollTo*`-Helfer umstellen**
- **Phase 2 & 3:** `function scrollTo2(id){…}` (Ph2 `:1158-1161`, Ph3 `:1098-1101`)
  löschen; alle `scrollTo2("x")` → `svScrollToId("x")`.
- **Phase 4:** gleiches `scrollTo2` löschen, Aufrufe ersetzen
  (`grep -n "scrollTo2" phase4/phase4-schule.html`).
- **Phase 1:** `scrollToLetter(id)` nutzt Präfix + `block:"center"` → Rumpf durch
  `svScrollToId("letter-" + id, "center")` ersetzen **oder** Aufrufe direkt
  umstellen und Funktion löschen. `scrollToCert()` → Aufrufe durch
  `svScrollToId("certSection")` ersetzen, Funktion löschen.

---

## Verifikation dieser Welle

- [ ] **Step V.1: V-BUILD** — 4× `OK`, kein `ERR`, keine `#INCLUDE`-Reste in `dist/`.
- [ ] **Step V.2: V-TEST** — alle Specs grün.
- [ ] **Step V.3: V-SNAP (Stichprobe je Phase)** — Nav-Sprünge + ein Quiz-Shuffle
  funktionieren wie in der Baseline.

## Erwartete Abweichung

**Keine.** `svShuffle` und `svScrollToId` sind 1:1 die bisherigen lokalen
Funktionen — Verhalten identisch.

## Commit

```bash
git add shared/reader-util.js build.js phase1 phase2 phase3 phase4
git commit -m "♻️ Refactor: shuffle & scrollToId nach shared/reader-util.js"
```

## Übergabe / Nächste Welle

Nach Merge nach `master`: **Welle 2** (`shared/progress.js`) kann starten — sie
setzt `svShuffle` nicht zwingend voraus, baut aber auf dem stabilen, sauberen
Stand dieser Welle auf. Die Branch- & Baseline-Vorbereitung (Task 0) ist
**einmalig erledigt** und wird in keiner Folge-Welle wiederholt.
