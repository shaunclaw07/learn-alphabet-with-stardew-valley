# Mobile-First-Überarbeitung (Tablet & Smartphone) — Implementierungsplan

> **Für agentische Worker:** EMPFOHLENE SUB-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Task für Task umzusetzen. Schritte nutzen Checkbox-Syntax (`- [ ]`) zum Abhaken.

**Ziel:** Die vier HTML-Seiten des Stardew-Lesekurses von „Desktop-first mit Handy-Patch" auf eine echte **mobile-first** Basis (Smartphone → Tablet → Desktop) umstellen, mit touch-tauglichen Bedienelementen für ein 5–6-jähriges Kind.

**Architektur:** Reine CSS/HTML-Änderungen in **self-contained** Dateien (kein Build, kein Framework, kein geteiltes CSS-File). Ein **kanonischer Responsive-Baustein** (Tokens + globale Touch-/Motion-Regeln) wird per **Copy-Paste** in jede der vier Dateien eingefügt — genau wie schon Voice-Picker/`speak()` phasenübergreifend dupliziert sind. Basis-CSS = Smartphone, Hochskalieren nach oben mit `min-width`-Media-Queries.

**Tech-Stack:** HTML5, CSS (inline im `<style>`), Vanilla-JS (inline). Google-Fonts-`<link>` ist die einzige externe Abhängigkeit. Keine Test-Runner — Verifikation via Node-Syntaxcheck + visuelle Browser-Prüfung.

## Global Constraints (gelten für JEDEN Task, wörtlich aus CLAUDE.md)

- **Self-contained:** Alles inline in der jeweiligen Datei. Keine neuen externen Assets, keine gemeinsame JS/CSS-Datei. Einzige erlaubte externe Ressource bleibt die bestehende Google-Fonts-`<link>`.
- **Sprache:** Alle Nutzertexte, Kommentare und Commit-Messages auf **Deutsch**. Commit-Präfix mit passendem Emoji (z. B. „📱 Phase 1: …").
- **Design-Tokens unverändert:** Farben Grün `#7ec850`→`#5da03c`, Rahmen `#3d6b22`; Holz `#8b6914`/`#c49a2a`; Creme `#fffaf0`/`#f5eedc`; Gold `#ffd700`; Orange `#ff6b35`; Text `#4a3728`. Fonts `Press Start 2P` (Überschriften/Badges) + `Nunito` (Fließtext). **Buchstaben immer `Nunito` 800, nie Pixel-Font.**
- **Zoom niemals sperren:** `user-scalable=no` / `maximum-scale` verboten. Bestehende Viewport-Metas bleiben `width=device-width, initial-scale=1.0`.
- **Didaktik unangetastet:** Nur diese HTML-/JS-Änderungen betreffen Layout & Bedienung — Inhalte, Wortschatz, Decodability-Regeln, Reihenfolge NICHT ändern.
- **Kein Commit auf `master` ohne Branch** (außer der Nutzer will es ausdrücklich). Empfehlung: Branch `feature/mobile-first`.
- **Breakpoints (einheitlich):** Basis = Smartphone. `@media (min-width: 480px)` große Handys, `@media (min-width: 768px)` Tablet, `@media (min-width: 1024px)` Desktop. `@media (hover: hover)` für Hover-Effekte. `@media (prefers-reduced-motion: reduce)` für Motion.

---

## Gemeinsame Bausteine (kanonisch — wird in Tasks referenziert)

### Baustein-CSS „TOKENS + GLOBAL" (in JEDE der 4 Dateien einfügen)

Direkt **nach dem RESET/BASE-Block** (nach den `*`/`html`/`body`-Regeln) einfügen:

```css
/* ===== DESIGN TOKENS (mobile-first) ===== */
:root {
  --tap: 44px;            /* Mindest-Touch-Target */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px;
  --sp-4: 16px; --sp-6: 24px; --sp-8: 32px;
}

/* ===== TOUCH & MOTION (global) ===== */
button, a, select,
.nav-btn, .silben-chip, .b-chip, .b-slot, .ws-letter,
.letter-display, .quiz-btn, .b-btn, .info-toggle-btn, .back-link {
  touch-action: manipulation;   /* entfernt 300ms-Tap-Delay */
}

/* Press-Feedback für Touch (funktioniert ohne Hover) */
.nav-btn:active, .silben-chip:active, .b-chip:active,
.quiz-btn:active, .b-btn:active, .letter-display:active,
.ws-letter:active, .back-link:active, .info-toggle-btn:active {
  transform: scale(0.96);
}

/* Sichtbarer Fokusring für Tastatur/Screenreader */
a:focus-visible, button:focus-visible, select:focus-visible,
.nav-btn:focus-visible, .info-toggle-btn:focus-visible {
  outline: 3px solid #3d6b22;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Regel `min-height: 100vh` → `min-height: 100dvh`

In jeder Datei steht im `body`-Block (jeweils Zeile ~30) `min-height: 100vh;`. **In allen vier Dateien** ersetzen durch `min-height: 100dvh;`.

### Baustein-CSS „NAV = HORIZONTALER SCROLL-STREIFEN" (Phase 1 & Phase 2)

Ersetzt/ergänzt die bestehenden `.nav-row` / `.nav-btn`-Regeln (siehe Tasks für Datei-spezifische alte Werte):

```css
/* Mobil: eine Zeile, seitlich wischbar */
.nav-row {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
  gap: var(--sp-2);
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  margin: 20px auto 0;
  max-width: 900px;
  position: sticky;
  top: calc(10px + env(safe-area-inset-top, 0px));
  z-index: 10;
  background: #f5eedcee;
  backdrop-filter: blur(6px);
  padding: 10px;
  border-radius: 16px;
}
.nav-row::-webkit-scrollbar { height: 6px; }
.nav-row::-webkit-scrollbar-thumb { background: #c49a2a; border-radius: 3px; }

.nav-btn {
  flex: 0 0 auto;
  min-width: var(--tap);
  height: var(--tap);          /* 44px statt 42/34 */
  padding: 0 12px;
  scroll-snap-align: start;
  border-radius: 12px;
  border: 2px solid #8b6914;
  background: #fffaf0;
  font-family: "Nunito", sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
  color: #4a3728;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-btn.done { background: #ffd700; border-color: #c49a2a; }
.nav-btn.special {
  min-width: auto;
  padding: 0 14px;
  font-size: 0.55rem;
  background: #ff6b35;
  color: #fff;
  border-color: #c44220;
}

/* Ab Tablet: Umbruch + Zentrierung statt Scroll */
@media (min-width: 768px) {
  .nav-row { flex-wrap: wrap; overflow: visible; justify-content: center; }
}
/* Hover nur auf Hover-Geräten (kein Sticky-Hover auf Touch) */
@media (hover: hover) {
  .nav-btn:hover, .nav-btn.active {
    background: #7ec850; color: #fff; border-color: #3d6b22;
    box-shadow: 0 4px 12px rgba(126,200,80,.4);
  }
}
/* Aktiver Zustand IMMER sichtbar (auch Touch) */
.nav-btn.active {
  background: #7ec850; color: #fff; border-color: #3d6b22;
}
```

### Baustein-CSS „BACK-LINK" (kanonisch, aus Phase 2 übernommen)

```css
.back-link {
  position: absolute;
  top: calc(14px + env(safe-area-inset-top, 0px));
  left: 14px;
  background: #fffaf0;
  color: #4a3728;
  text-decoration: none;
  font-weight: 800;
  font-size: 0.9rem;
  min-height: var(--tap);
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 10px;
  border: 2px solid #8b6914;
  transition: background .2s, transform .2s;
  z-index: 6;
}
@media (hover: hover) {
  .back-link:hover { background: #ffd700; transform: scale(1.05); }
}
```

Zugehöriges HTML als **erstes Kind** von `<header class="header">`:

```html
<a class="back-link" href="../index.html">← Übersicht</a>
```

### Verifikationsbefehl (Node-Syntaxcheck, aus CLAUDE.md)

```bash
node -e 'const fs=require("fs");const h=fs.readFileSync(process.argv[1],"utf8");
[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new Function(m[1]);
console.log("script#"+i+" OK")}catch(e){console.log("ERR:",e.message)}});' <DATEI>
```

CSS wird nicht syntaxgeprüft — nach jeder Datei **visuell** im Browser bei 320 / 375 / 768 / 1024 px + Landscape prüfen (Chrome-DevTools-Geräteleiste). Falls „Claude in Chrome"-Extension verbunden: Live-Test; sonst offen ausweisen, nicht „getestet" behaupten.

---

## Task 1: `index.html` (Phasenauswahl)

**Files:**
- Modify: `index.html` (Body-Block ~Z. 23–33, `.phase-grid` ~Z. 103–110, Media-Query ~Z. 258–265)

**Interfaces:**
- Consumes: Gemeinsame Bausteine „TOKENS + GLOBAL", `100vh`→`100dvh`.
- Produces: nichts (Startseite, kein Back-Link nötig).

- [ ] **Schritt 1: Branch anlegen**

```bash
git checkout -b feature/mobile-first
```

- [ ] **Schritt 2: TOKENS+GLOBAL-Baustein einfügen**

Den Block „TOKENS + GLOBAL" (siehe Gemeinsame Bausteine) direkt nach dem `body{…}`-Block einfügen. (Die `:root`-Tokens und globalen Touch-Regeln.)

- [ ] **Schritt 3: `100vh` → `100dvh`**

Im `body`-Block `min-height: 100vh;` ersetzen durch `min-height: 100dvh;`.

- [ ] **Schritt 4: Grid-Überlauf bei 320px beheben**

In `.phase-grid` ersetzen:

```css
/* ALT */ grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
/* NEU */ grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
```

- [ ] **Schritt 5: Bestehende Media-Query in mobile-first-Logik überführen**

Die Regel `@media (max-width: 600px)` (nur `.header h1 { font-size: 0.8rem }` + `.phase-grid { gap: 32px }`) darf bleiben — sie ist ein reiner Abwärts-Feinschliff und harmlos. Optional: `.header h1` bereits in der Basis kleiner setzen und ab `@media (min-width: 768px)` vergrößern. **Minimal-Umsetzung:** Media-Query unverändert lassen.

- [ ] **Schritt 6: Syntax- & Sichtprüfung**

Run: `node -e '…' index.html` → Erwartung: `script#0 OK`.
Visuell bei 320/375/768/1024 px: kein horizontaler Scroll, Karten füllen die Breite, Header lesbar.

- [ ] **Schritt 7: Commit**

```bash
git add index.html
git commit -m "📱 Startseite: mobile-first Tokens, dvh & Grid-Überlauf-Fix"
```

---

## Task 2: `phase1/lese-schule.html` (Buchstaben)

**Files:**
- Modify: `phase1/lese-schule.html` — Body ~Z. 30; Header ~Z. 36–43; `.silben-chip` ~Z. 297–318; `.nav-row` ~Z. 357–370; `.nav-btn` ~Z. 371–406; `.info-toggle-btn` ~Z. 512–536; Media-Query ~Z. 590–614; `<header>`-HTML im Body.

**Interfaces:**
- Consumes: „TOKENS + GLOBAL", „NAV = SCROLL-STREIFEN", „BACK-LINK".
- Produces: konsistente Nav & Back-Link-Muster, die Phase 2 spiegelt.

- [ ] **Schritt 1: TOKENS+GLOBAL-Baustein einfügen** (nach `body{…}`, ~Z. 33).

- [ ] **Schritt 2: `100vh` → `100dvh`** (Body, ~Z. 30).

- [ ] **Schritt 3: Header-Platz für Back-Link schaffen**

Im `.header`-Block (`padding: 20px 16px 24px;`) mobil oben Platz schaffen, damit der Back-Link `.header-icons`/`h1` nicht überlappt:

```css
.header { padding: 20px 16px 24px; padding-top: calc(20px + env(safe-area-inset-top, 0px)); }
@media (max-width: 600px) { .header { padding-top: 56px; } }
```

- [ ] **Schritt 4: BACK-LINK-CSS + HTML einfügen**

„BACK-LINK"-CSS-Baustein in den `<style>` einfügen. Im Body als erstes Kind von `<header class="header">` einfügen:

```html
<a class="back-link" href="../index.html">← Übersicht</a>
```

- [ ] **Schritt 5: NAV-Baustein anwenden**

`.nav-row`, `.nav-btn`, `.nav-btn.special`, `.nav-btn.done` durch den „NAV = SCROLL-STREIFEN"-Baustein ersetzen. **Wichtig:** Die alte quadratische `width:42px; height:42px`-Definition und die `.nav-btn:hover,.nav-btn.active`-Kombiregel entfernen (der Baustein trennt Hover via `@media(hover:hover)`).

- [ ] **Schritt 6: Silben-Chips auf Touch-Höhe bringen**

In `.silben-chip` ergänzen (`display`/`min-height`), damit die Chips ≥44px hoch sind:

```css
.silben-chip {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap);
  /* restliche Eigenschaften unverändert: Gold-Gradient, padding 6px 14px, font 1.1rem … */
}
```

Die `.silben-chip:hover`-Regel in `@media (hover: hover)` kapseln (die `:active`-Regel liefert bereits Touch-Feedback über den Global-Baustein).

- [ ] **Schritt 7: Info-Button-Tap-Fläche auf 44px erweitern (Optik 30px bleibt)**

```css
.info-toggle-btn { /* visuell 30×30 unverändert */ }
.info-toggle-btn::before {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  width: var(--tap); height: var(--tap);
  transform: translate(-50%, -50%);
}
```

Im HTML dem Info-Button `aria-label="Eltern-Info anzeigen"` geben (JS-erzeugte Buttons: `infoBtn.setAttribute('aria-label', …)` — Stelle im Script suchen, wo `info-toggle-btn` erstellt wird).

- [ ] **Schritt 8: Alte 34px-Shrink-Regel entfernen**

In `@media (max-width: 600px)` die `.nav-btn { width:34px; height:34px; font-size:0.5rem; }`-Regel **löschen** (der Scroll-Streifen hält bereits 44px). Rest der Media-Query (`.card-content` einspaltig, `.letter-display` 110px, `.header h1` 0.6rem) darf bleiben.

- [ ] **Schritt 9: Syntax- & Sichtprüfung**

Run: `node -e '…' phase1/lese-schule.html` → alle `script#N OK`.
Visuell: Back-Link sichtbar & ohne Überlappung; Nav als eine wischbare Zeile mit ≥44px-Buttons; Silben-Chips gut tippbar; Info-Panel öffnet per Tap.

- [ ] **Schritt 10: Commit**

```bash
git add phase1/lese-schule.html
git commit -m "📱 Phase 1: Back-Link, Scroll-Nav & Touch-Targets ≥44px"
```

---

## Task 3: `phase2/phase2-schule.html` (Silben & Wörter)

**Files:**
- Modify: `phase2/phase2-schule.html` — Body ~Z. 30; `.back-link` ~Z. 59–76; `.nav-row` ~Z. 188–202; `.nav-btn` ~Z. 203–231; Media-Query ~Z. 866–882.

**Interfaces:**
- Consumes: „TOKENS + GLOBAL", „NAV = SCROLL-STREIFEN".
- Produces: mit Phase 1 identische Nav-/Back-Link-Optik.

- [ ] **Schritt 1: TOKENS+GLOBAL-Baustein einfügen** (nach `body{…}`).

- [ ] **Schritt 2: `100vh` → `100dvh`** (Body, ~Z. 30).

- [ ] **Schritt 3: Back-Link angleichen**

Den bestehenden `.back-link`-Block (Z. 59–76) durch den kanonischen „BACK-LINK"-Baustein ersetzen (fügt `min-height: var(--tap)`, `env(safe-area-inset-top)` und `@media(hover:hover)` hinzu). HTML-Back-Link (`../index.html`) existiert bereits — unverändert lassen.

- [ ] **Schritt 4: NAV-Baustein anwenden**

`.nav-row` + `.nav-btn` (+ `.special`) durch „NAV = SCROLL-STREIFEN" ersetzen. Bestehende `.nav-btn:hover,.nav-btn.active`-Kombiregel entfernen (Baustein trennt Hover korrekt).

- [ ] **Schritt 5: Header-Platz für Back-Link (mobil)**

Wie Phase 1, Schritt 3 — im `.header`-Block:

```css
@media (max-width: 600px) { .header { padding-top: 56px; } }
```

- [ ] **Schritt 6: `b-chip` / `b-slot` prüfen (meist ok)**

`.b-slot` (mobil 60px) und `.b-chip` (mobil `padding:10px 16px; font:1.3rem` ≈ 44px) erfüllen bereits ≥44px. Nur sicherstellen, dass die `.b-chip:hover`-Regel in `@media (hover: hover)` steht; `:active` kommt aus dem Global-Baustein. `aria-label` auf Info-Button setzen (wie Phase 1, Schritt 7 — JS-Stelle mit `info-toggle-btn`).

- [ ] **Schritt 7: Syntax- & Sichtprüfung**

Run: `node -e '…' phase2/phase2-schule.html` → alle `script#N OK`.
Visuell: Nav wischbar & ≥44px; Wort-Builder-Chips/Slots gut tippbar; Back-Link deckungsgleich mit Phase 1.

- [ ] **Schritt 8: Commit**

```bash
git add phase2/phase2-schule.html
git commit -m "📱 Phase 2: Scroll-Nav, dvh & Back-Link an Phase 1 angeglichen"
```

---

## Task 4: `lehrplan.html` (Eltern-Übersicht)

**Files:**
- Modify: `lehrplan.html` — Body ~Z. 30 (falls vorhanden); Header/Body (Back-Link ergänzen); Media-Query ~Z. 406.

**Interfaces:**
- Consumes: „TOKENS + GLOBAL", „BACK-LINK".
- Produces: konsistenter Back-Link; Tablet-Tauglichkeit.

- [ ] **Schritt 1: Datei zuerst lesen**

`lehrplan.html` öffnen und Header-Struktur + `body`-Block ansehen (die genaue Zeilennummer von `min-height: 100vh` und der Header-Aufbau weichen von den Phasen ab). Tabellen sind bereits `overflow-x: auto` (gut).

- [ ] **Schritt 2: TOKENS+GLOBAL-Baustein einfügen** (nach dem `body{…}`-Block) und `100vh` → `100dvh` ersetzen (falls vorhanden).

- [ ] **Schritt 3: Back-Link ergänzen**

„BACK-LINK"-CSS-Baustein einfügen (falls die Seite keinen relativ positionierten Header hat: `.header{ position: relative; }` sicherstellen). Als erstes Kind des Kopfbereichs:

```html
<a class="back-link" href="index.html">← Übersicht</a>
```

(Achtung: `lehrplan.html` liegt im Root → Ziel ist `index.html`, **nicht** `../index.html`.)

- [ ] **Schritt 4: Scroll-Affordance für breite Tabellen**

Sicherstellen, dass die Tabellen-Wrapper mobil einen sichtbaren Hinweis geben (dünner Schatten am Rand oder Randlinie), z. B.:

```css
.tbl-wrap, .table-scroll { /* falls Wrapper existiert; sonst .tbl-Elternelement */
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
```

Nur anpassen, falls beim Test bei 320/375px eine Tabelle abgeschnitten wirkt.

- [ ] **Schritt 5: Syntax- & Sichtprüfung**

Run: `node -e '…' lehrplan.html` → `script#N OK` (falls Scripts vorhanden).
Visuell bei 320/375/768/1024 px: kein horizontaler Body-Scroll (nur Tabellen scrollen intern), Back-Link führt zurück, Grids brechen sauber um.

- [ ] **Schritt 6: Commit**

```bash
git add lehrplan.html
git commit -m "📱 Lehrplan: Back-Link, mobile-first Tokens & Tablet-Tauglichkeit"
```

---

## Task 5: Gesamtverifikation & Abschluss

**Files:** alle vier (nur Prüfung, ggf. kleine Korrekturen).

- [ ] **Schritt 1: Syntaxcheck über alle Dateien**

```bash
for f in index.html lehrplan.html phase1/lese-schule.html phase2/phase2-schule.html; do
  echo "=== $f ==="; node -e 'const fs=require("fs");const h=fs.readFileSync(process.argv[1],"utf8");
  [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new Function(m[1]);
  console.log("script#"+i+" OK")}catch(e){console.log("ERR:",e.message)}});' "$f"; done
```

Erwartung: nur `OK`-Zeilen, keine `ERR:`.

- [ ] **Schritt 2: Reduced-Motion-Check**

DevTools → „Emulate CSS prefers-reduced-motion: reduce" → keine Dauer-Animation (⭐-Bounce steht still), Seiten weiter bedienbar.

- [ ] **Schritt 3: Touch-Target-Stichprobe**

Bei 375px per DevTools messen: Nav-Buttons, Silben-/Wort-Chips, Info-Button-Tapfläche, Back-Link jeweils ≥44px in mindestens einer Dimension bzw. ≥44px Tapfläche.

- [ ] **Schritt 4: Cross-Page-Konsistenz**

Phase 1 ↔ Phase 2: Back-Link identisch positioniert/gestylt, Nav identisch (Scroll-Streifen), Header identischer Abstand.

- [ ] **Schritt 5: Live-Test (nur falls möglich)**

Falls „Claude in Chrome"-Extension verbunden: je Seite bei 375px öffnen, Nav wischen, Buchstabe/Chip antippen (Audio + Fortschritt), Info-Panel öffnen. Sonst dem Nutzer mitteilen, dass der visuelle/Live-Test noch aussteht — **nicht** als „getestet" ausgeben, was nicht lief.

- [ ] **Schritt 6: Merge/Abschluss anbieten**

Dem Nutzer die Optionen aus `superpowers:finishing-a-development-branch` vorlegen (Merge nach `master` / PR / offen lassen). **Nicht** ungefragt auf `master` mergen.

---

## Self-Review (vom Autor durchgeführt)

- **Spec-Abdeckung:** Fundament (Tokens/dvh/touch/reduced-motion/safe-area) → Task 1–4 je Schritt 1–3. Nav-Scroll-Streifen → Task 2/3. Back-Link Phase 1 + Konsistenz → Task 2/3/4. Touch-Targets ≥44px → Task 2 (Nav/Chip/Info), Task 3 (Prüfung). index-Überlauf → Task 1. Tablet-Breakpoint → im NAV-Baustein (`min-width:768px`) + Task 4. A11y (aria-label/Fokus) → Global-Baustein + Task 2/3 Schritt 7/6. Verifikation → Task 5. ✅
- **Platzhalter:** Keine „TBD"/„Fehlerbehandlung ergänzen" — alle CSS-Blöcke konkret. Einzige bewusste Leseanweisung: Task 4 Schritt 1 (Datei zuerst lesen), weil `lehrplan.html` eine abweichende Header-Struktur hat, die vor Ort geprüft werden muss.
- **Typ-/Namenskonsistenz:** Klassennamen (`.nav-row`, `.nav-btn`, `.back-link`, `.silben-chip`, `.info-toggle-btn`, `.phase-grid`) entsprechen den bestehenden Dateien. Token `--tap` durchgängig 44px.
