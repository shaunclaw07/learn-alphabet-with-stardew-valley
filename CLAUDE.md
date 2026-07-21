# CLAUDE.md — Lesen lernen mit Stardew Valley

## Was das ist

Ein deutscher **Lese-Lern-Kurs für ein Kind (5–6 Jahre)**, thematisch komplett
in **Stardew Valley** eingebettet. Kein Framework — die **gebauten** Seiten sind
self-contained HTML-Dateien, die per Doppelklick (`file://`) laufen; ein kleiner
Node-Build (`node build.js`) setzt sie aus geteilten `shared/`-Bausteinen
zusammen. Zielgruppe der Oberfläche ist das Kind; die Eltern-Infos sind
ausklappbar.

Der didaktische Gesamtplan steht in `lesen-lernen-lehrplan.md`
(Master-Referenz) und `lehrplan.html` (schöne HTML-Fassung). Alle Stardew-
Begriffe stammen aus dem offiziellen deutschen Wiki — **nichts erfinden**, im
Zweifel gegen den Lehrplan prüfen.

## Roadmap (4 Phasen)

| Phase | Fokus | Datei | Status |
|-------|-------|-------|--------|
| 1 | Buchstaben als **Laute** (21 Stück) | `phase1/lese-schule.html` | ✅ fertig |
| 2 | **Silben** verbinden & erste Wörter | `phase2/phase2-schule.html` | ✅ fertig |
| 3 | Stardew-**Wortschatz** | `phase3/phase3-schule.html` | ✅ fertig |
| 4 | Erste **Sätze** & Dialoge | `phase4/phase4-schule.html` | ✅ fertig |

`index.html` (Root) ist die **Phasenauswahl** — Startbildschirm mit 4 Karten,
zeigt Fortschritt pro Phase, sperrt noch nicht gebaute Phasen als „Bald
verfügbar". Beim Anlegen einer neuen Phase: neue Karte in `index.html`
freischalten (`href` setzen, `soon` entfernen, `progressKey`/`total`/`einheit`
ergänzen). Zusätzlich für die **PWA**: die neue Seite in die
`APP_SHELL`-Precache-Liste in `sw.js` eintragen und `CACHE_VERSION` erhöhen.
Die neue Phasen-HTML übernimmt den **kanonischen Satz `shared/`-Includes**
(base.css, dark-mode.css, voice-picker.js, celebrate.js, pwa-head.html,
sw-register.js — siehe „Geteilte Bausteine"), ruft in den Übungen
`svCorrect()`/`svFinish()`/`svStreakReset()` auf und wird ggf. in die
Seiten-Listen der Playwright-Tests (`tests/spec/*.spec.ts`) aufgenommen.

## Verbindliche Konventionen (für ALLE Phasen)

**Build-System (NEU seit 2026-07)**
- Source-Dateien nutzen `<!-- #INCLUDE shared/datei -->`, `/* #INCLUDE shared/datei */` 
  und `// #INCLUDE shared/datei.js` Marker für geteilte Blöcke.
- **`node build.js`** baut self-contained HTML-Dateien nach `dist/`.
- `dist/` ist das Deployment-Ziel — NICHT direkt die Source-HTMLs.
- Lokal: `dist/index.html` per Doppelklick öffnen. `dist/` ist `.gitignore`d.
- Bei neuen Shared-Blöcken: in `shared/` ablegen, Marker in den Phasen setzen
  **und** in `build.js` in die `includes`-Map eintragen.
- **Binär-Gotcha:** `build.js` schickt nur Text-Endungen durch UTF-8; Binär-
  Assets (PNG/PDF/WOFF) werden **roh** kopiert. Neue Shared-Blöcke müssen Text
  sein; neue Binärdateien laufen automatisch korrekt.

**Geteilte Bausteine (`shared/`)** — der Build inlint sie, das Endergebnis
bleibt self-contained. Jede Phasen-Seite **und** `index.html` bindet den
**kanonischen Satz** per Marker ein (neue Seiten 1:1 übernehmen):
- `shared/base.css` — Design-Tokens + globale Touch-/Motion-/`prefers-reduced-
  motion`-Regeln (die **Responsive-Basis**).
- `shared/dark-mode.css` — **Dark Mode** via `@media (prefers-color-scheme:
  dark)`; jede neue Seite MUSS diesen Include am Ende des `<style>` haben.
- `shared/voice-picker.js` — Vorlese-Engine (`speak()`, Voice-Picker, `showNoVoices()`).
- `shared/celebrate.js` — Belohnungs-Feedback (Konfetti/Ton/Lob/Streaks).
- `shared/farm.js` — **Sammel-Farm** (nur `index.html`): Katalog +
  Freischalt-Logik + Render der Farm-Kacheln (`svFarmSync`/`svFarmRender`).
- `shared/trace.js` — **Buchstaben-Tracing** (nur Phase 1): Canvas-Engine, die
  den Zielbuchstaben als Font-Glyph in ein Raster (`GRID=24`) rendert und die
  Abdeckung beim Nachspuren misst (`window.svTrace` = `start`/`markAt`/
  `coverage`/`reset`/`_cells`/`_done`). Bei `≥ THRESHOLD (0.55)` Abdeckung gilt
  der Buchstabe als geschafft und meldet ans SRS via `svCorrect("p1:trace:<id>")`
  (kein neuer `localStorage`-Key). Phase 1 hat dafür eine **Schreib-Werkstatt**
  (Nav-Button „✏️", erscheint wie die Lese-Werkstatt ab 5 gelernten Buchstaben).
- `shared/pwa-head.html` + `shared/sw-register.js` — PWA-`<head>` + SW-Registrierung.

**Struktur**
- Eine Phase = **eine** HTML-Source-Datei in eigenem Ordner
  (`phaseN/…-schule.html`). Nach dem Build ist **alles inline** — kein externes
  Asset außer der Google-Fonts-`<link>`. Gemeinsame Blöcke leben in `shared/`
  und werden per `#INCLUDE`-Marker eingebunden (nicht mehr pro Datei kopieren).
- Jede Phasen-Seite hat oben links einen **`← Übersicht`**-Back-Link auf
  `../index.html`.

**Design-Tokens** (immer gleich, damit alles wie EIN Kurs wirkt)
- Fonts: `Press Start 2P` (Überschriften/Badges) + `Nunito` (Fließtext).
- Farben: Grün `#7ec850`→`#5da03c`, Rahmen-Grün `#3d6b22`; Holz `#8b6914` /
  `#c49a2a`; Creme `#fffaf0` / `#f5eedc`; Gold `#ffd700`; Orange `#ff6b35`;
  Text `#4a3728`.
- Wiederkehrende Bausteine: Header mit Holz-Bordüre, Progress-Bar mit ⭐,
  Sticky-Nav, Karten mit `card-number`-Badge, ausklappbares **Eltern-Info**-
  Panel (ⓘ-Button), Zertifikat am Ende, dezente `farm-decoration`-Emojis.
- **Buchstaben immer in `Nunito` (font-weight 800) rendern**, NICHT im
  Pixel-Font — die korrekte Buchstabenform ist zum Lesenlernen essenziell.
- Tokens für Touch/Abstände: `--tap: 44px`, Spacing-Skala `--sp-1 … --sp-8`
  auf 4/8-Basis.

**Mobile-First & Responsive (WICHTIG — Zielgerät ist Tablet/Smartphone)**
- **Mobile-first bauen:** Basis-CSS = Smartphone, nach oben skalieren mit
  `min-width`-Media-Queries (nicht Desktop-first mit `max-width`-Patch).
  Einheitliche Breakpoints: `480px` (große Handys), `768px` (Tablet),
  `1024px` (Desktop).
- **Touch-Targets ≥ 44×44px**, mind. 8px Abstand — für Nav-Buttons, Silben-/
  Wort-Chips, Info-/Audio-Buttons und Back-Link. Kleine Icons per unsichtbarer
  `::before`-Fläche (44px) vergrößern; die sichtbare Optik darf kleiner bleiben.
- **Press-Feedback statt Hover:** `:active { transform: scale(0.96); }` +
  `touch-action: manipulation`. Hover-Effekte NUR in `@media (hover: hover)`
  kapseln, sonst bleibt nach dem Tap ein „Sticky-Hover" hängen.
- **Nav = horizontaler Scroll-Streifen** auf dem Handy (`overflow-x: auto`,
  `scroll-snap`, `flex-wrap: nowrap`, Buttons ≥44px); ab `768px` wieder
  umbrechen/zentrieren.
- **`min-height: 100dvh`** statt `100vh`; Sticky-/Fixed-Elemente mit
  `env(safe-area-inset-*)` gegen Notch/Gestenleiste absichern.
- **`@media (prefers-reduced-motion: reduce)`** ergänzen: Dauer-Animationen
  (⭐-Bounce, Shake, Transitions) abschalten.
- **A11y:** sichtbarer `:focus-visible`-Ring; `aria-label` auf Icon-Buttons
  (ⓘ, 🔊); Zoom NIE sperren (kein `user-scalable=no` / `maximum-scale`).
- Diese Tokens + globalen Touch-/Motion-Regeln stehen in **`shared/base.css`**
  und werden per `#INCLUDE` eingebunden — nicht mehr pro Datei kopieren.
  Vollständiger Umbau-Plan:
  `docs/superpowers/plans/2026-07-20-mobile-first-ueberarbeitung.md`.

**Dark Mode**
- Kommt aus **`shared/base.css`** (Basis) + **`shared/dark-mode.css`**
  (`@media (prefers-color-scheme: dark)`), beide per `#INCLUDE`. Jede Seite —
  inkl. `index.html` — muss den `dark-mode.css`-Include am Ende des `<style>`
  haben, sonst bleibt sie im Dark Mode hell.
- Neue Farbflächen immer **in beiden Modi** denken: Dark-Overrides für neue
  Karten/Panels in `shared/dark-mode.css` ergänzen, nicht pro Seite hart kodieren.

**Audio (Vorlesen)**
- Web Speech API (`speechSynthesis`), offline & kostenlos. Deutsche Stimme hat
  IMMER Vorrang; Voice-Picker + `isGermanVoice()`/`refreshVoices()`/`speak()`
  **plus** `showNoVoices()` und das Init-Polling aus Phase 1 **1:1 übernehmen**.
- **Robustes Stimmen-Laden (Pflicht):** `voiceschanged` feuert auf Fire OS /
  manchen Tablets unzuverlässig — Stimmen im Init per `setTimeout`-Loop
  mehrfach nachladen (~12×/250 ms). Bleibt `getVoices()` dauerhaft leer,
  `showNoVoices()` aufrufen (sichtbarer Klartext-Hinweis + `select` disablen)
  statt still ein leeres Dropdown zu lassen. Häufigste Ursache eines leeren
  Dropdowns: **Amazon-Kids-Modus** gibt die Web Speech API nicht frei.
- Gespeicherte Stimme ist **phasenübergreifend**: `localStorage`-Key
  `sv_lesen_voice`.
- Silben/Wörter zum Sprechen **kleinschreiben** (`speak(text.toLowerCase())`) —
  sonst buchstabiert die Stimme Großbuchstaben. Anlaut-Prinzip: das Kind hört
  den Laut im echten Wort, nicht den Buchstaben-Namen.

**Belohnungs-Feedback (`shared/celebrate.js`)**
- Globale API, in jeder Übung an den passenden Stellen aufrufen: `svCorrect()`
  bei richtiger Antwort (Ding + Konfetti + Lob-Toast + Serie), `svFinish(text)`
  beim Abschluss (Fanfare + großes Konfetti), `svStreakReset()` bei falsch.
- Selbst-enthalten: injiziert eigenes CSS, den Ton-Aus-Button und den Toast;
  Konfetti läuft in einer clippenden Overlay-Ebene (kein horizontaler Scroll);
  respektiert `prefers-reduced-motion` und den Ton-Aus-Schalter. Offline, ohne
  Assets (WebAudio-Töne). Keine per-Phase-UI nötig — nur die 3 Aufrufe.

**Fortschritt**
- Pro Phase ein `localStorage`-Key: `sv_lesen_phase1_progress`,
  `sv_lesen_phase2_progress`, … — JSON-Array der erledigten IDs. `index.html`
  liest diese Keys für die Fortschrittsanzeige; beim Bauen einer Phase den Key
  dort eintragen.
- Weitere **phasenübergreifende** Keys: `sv_lesen_voice` (Stimme),
  `sv_lesen_muted` (Belohnungs-Ton an/aus), `sv_lesen_daily` (Tages-Streak
  `{last,count}`, von `celebrate.js` beim ersten Richtig pro Tag gepflegt),
  `sv_lesen_srs` (Spaced-Repetition-Daten `ItemId → {box,due,seen,correct}`,
  von `shared/srs.js` gepflegt; Item-ID-Schema `p<phase>:<ID>`),
  `sv_lesen_farm` (Sammel-Farm `{unlocked:[keys]}`, von `shared/farm.js`
  gepflegt; schaltet je 4 erledigte Aufgaben ein Farm-Objekt frei).
- `index.html` zeigt Tages-Streak + **Sammel-Farm** + **Gesamt-Zertifikat**
  (alle Phasen 100 %) und hat einen **Reset-Button**, der alle `*_progress`-Keys
  + `sv_lesen_daily` + `sv_lesen_srs` + `sv_lesen_farm` löscht.

**Didaktik / Decodability (WICHTIG)**
- Nur Buchstaben verwenden, die in Phase 1 gelehrt wurden:
  `M A L O S T E N I R U F H K W B G P D Z J`.
- Im kind-lesbaren Kernwortschatz **keine Digraphen/Umlaute**: kein SCH, CH,
  EI, AU, ä/ö/ü, ß. (Diese kommen erst viel später.)
- Reihenfolge/Prinzipien aus `lesen-lernen-lehrplan.md` respektieren
  (Zieh-Laute + Vokale zuerst; Verwechsel-Paare m/n, t/d, p/b, k/g getrennt).
- Ton: motivierend, kurze Einheiten, „loben, loben, loben", kein Druck.

**Sprache**
- Alle Nutzertexte, Kommentare und Commit-Messages auf **Deutsch**.

## Verifizieren (Build + Playwright-Tests)

- **Bauen:** `node build.js` → `dist/`. Immer gegen `dist/` prüfen, nicht gegen
  die Source-HTMLs.
- **Tests (Playwright, existiert!):**
  ```bash
  cd tests && npm ci && npx playwright install chromium && npx playwright test
  ```
  Suites in `tests/spec/*.spec.ts`: a11y, navigation, progress, pwa, responsive,
  structure. **Die CI blockt den Deploy, wenn Tests rot sind** — vor dem Push
  lokal grün machen. (Die WebServer-Zeilen mit `ConnectionAbortedError` sind
  harmloses Rauschen, kein Testfehler.)
- **JS-Syntax schnell prüfen** (Chrome-Extension ist oft nicht verbunden), gegen
  die **gebauten** Dateien:
  ```bash
  node -e 'const fs=require("fs");const h=fs.readFileSync(process.argv[1],"utf8");
  [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new Function(m[1]);
  console.log("script#"+i+" OK")}catch(e){console.log("ERR:",e.message)}});' dist/phaseN/datei.html
  ```
- Danach im Browser öffnen und Konsole prüfen. Live-Test mit „Claude in Chrome"
  nur, wenn die Extension verbunden ist — sonst dem Nutzer sagen, dass der
  visuelle Test aussteht (nichts als „getestet" behaupten, was nicht lief).
- **Responsive prüfen:** bei `320 / 375 / 768 / 1024 px` + Landscape (kein
  horizontaler Body-Scroll, Touch-Targets ≥44px) und mit aktiviertem
  `prefers-reduced-motion`.

## Deployment

- **GitHub Pages**, automatisch via `.github/workflows/deploy.yml` bei jedem
  Push auf `master`: erst Playwright-Tests, dann `node build.js`, dann `dist/`
  deployen. Kein manueller Schritt.
- Live: `https://learn-alphabet-with-stardew-valley.schaflabs.com/`.
- **PWA/SW-Update:** `sw.js` wird von GitHub Pages mit fixer `Cache-Control`
  ausgeliefert (nicht änderbar) — für zuverlässige Updates bei jeder Änderung an
  gecachten Seiten **`CACHE_VERSION` in `sw.js` erhöhen**. Der SW-`install`
  cached **ausfallsicher pro Ressource** (kein atomares `addAll`), damit eine
  einzelne fehlende Datei die Installierbarkeit nicht killt.

## Git

- Commit/Push nur auf ausdrückliche Aufforderung. Commit-Messages: deutsch, mit
  passendem Emoji-Präfix (siehe Historie, z. B. „🧩 Phase 2: …").
- Nicht auf `main`/`master` committen ohne Branch, außer der Nutzer will es.

## Materialien (Papier-Backup)

Neben den Apps gibt es Markdown-Lektionen und druckbare Materialien
(`phase1/lektionen/`, `phase1/materialien/`, `phase1/phase1-druckversion.html`
+ `.pdf`). **Jede Phase hat eine druckbare A4-HTML-Fassung**
(`phaseN/phaseN-druckversion.html`, gleicher Aufbau: Deckblatt → Seiten je
Lektion/Thema → Ausschneide-Karten/Streifen → Zertifikat). Nur Phase 1 hat
zusätzlich eine fertige `.pdf`; für die anderen druckt man per Browser
(„Drucken → Als PDF speichern"). Neue Druckversionen analog `phase1-druckversion.html`.
