# Welle 7 — Abschluss: `CACHE_VERSION`-Bump + Doku + Gesamtlauf — Ausführungsplan

> **Status:** Entwurf (vor Umsetzung).
> **Für agentische Worker:** REQUIRED SUB-SKILL `superpowers:executing-plans`.
> Checkbox-Syntax (`- [ ]`). Welle endet mit grünem Build **und** Tests **und
> eigenem Commit**. Dies ist das **Freigabe-Tor** des Refaktors. Mapping &
> Abhängigkeiten: `docs/refactoring-shared-engine-wellen-index.md`.

**Quelle & Einordnung**

- **Primär (Wie?):** `docs/plan-refactoring-shared-engine.md` → **Task 7**.
- **Architektur (Warum?):** Design-Spec → **Schritt 6** (`index.html` + Aufräumen
  - Doku).
- **Rolle:** Braucht den finalen Stand aus den Wellen 1–6. Bumpt die
  `CACHE_VERSION` (damit gecachte Nutzer die neuen `shared/`-Includes sehen),
  zieht die Doku nach, belegt die Zeilen-Reduktion und führt den Gesamtlauf
  durch. **Pflicht vor jedem Merge nach `master`/Deploy.**

**Ziel:** Den Refaktor abrunden — `sw.js` `CACHE_VERSION` von `sv-lesen-v6` auf
`sv-lesen-v7`, `CLAUDE.md`/`README.md` um die neuen `shared/`-Module ergänzen,
volle Verifikation, Zeilen-Reduktion belegen, `index.html` aufräumen wo sinnvoll.

**Tech-Stack:** `sw.js`, Markdown, Node-Build, Playwright.

> **Warum Cache-Bump hier und nicht pro Welle?** In diesem Refaktor wird
> zwischendurch nicht deployt; der Bump gesammelt am Ende verhindert
  Versions-Sprünge `v6 → v6.1 → …`. (Wird zwischendurch doch gepusht: jeweiligen
  Wellen-Bump nachholen.) Stand vor dieser Welle: `sv-lesen-v6`.

## Gemeinsame Vorgaben (Kurzform — volle Fassung im Masterplan)

Gegen `dist/` prüfen · `node build.js` vor jeder Prüfung · **`CACHE_VERSION` in
`sw.js` erhöhen** bei Änderung an gecachten Seiten/`shared/`-Includes (PFLICHT
bei JEDER Inhaltsänderung) · neue `shared/*.js` brauchen **keinen**
`APP_SHELL`-Eintrag (werden inlined; nur ganze Seiten stehen in `APP_SHELL`) ·
Deutsch+Emoji bei Texten/Kommentaren/Commits · keine Änderung an Druckversionen/
Lehrplan/bestehenden Shared-Bausteinen (außer Doku-Einträgen).

## Verifikations-Kommandos

```
V-BUILD:   node build.js  + JS-Syntax-Check (Snippet s. Masterplan); danach: grep -rn "#INCLUDE" dist/phase*/*.html  ( muss leer sein )
V-TEST:    cd tests && npx playwright test   (komplette Suite)
V-SNAP:    volle Checkliste (1)-(4) über ALLE vier Phasen
V-REDUZ:   Zeilenzähler der Phasen vor/nach (s. Step 3)
```

## Datei-Struktur

- **Modify:** `sw.js` (`CACHE_VERSION`)
- **Modify:** `CLAUDE.md` (Abschnitt „Geteilte Bausteine (`shared/`)")
- **Modify:** `README.md` (falls dort eine Modul-/Dateiliste steht)
- **Prüfen (aufräumen wo sinnvoll):** `index.html` (nutzt ggf. `progress.js`/
  `reader-util.js`; tote Reste entfernen)

---

### Task 7: Abschluss

- [ ] **Step 7.1: `CACHE_VERSION` erhöhen**
In `sw.js` `CACHE_VERSION` von `sv-lesen-v6` auf `sv-lesen-v7` setzen:

```bash
grep -n "CACHE_VERSION" sw.js
```

Neue `shared/*.js`-Dateien brauchen **keinen** `APP_SHELL`-Eintrag (sie werden
inlined; nur ganze Seiten stehen in `APP_SHELL`) — das trotzdem gegen die Liste
prüfen.

- [ ] **Step 7.2: Doku nachziehen**
In `CLAUDE.md`, Abschnitt „Geteilte Bausteine (`shared/`)", die neuen Module
ergänzen (je 1 Zeile, Stil wie bestehende Einträge):
- `shared/reader-util.js` — `svShuffle`/`svScrollToId` (kleine Helfer).
- `shared/progress.js` — `svProgress.{init,has,toggle,size,all,updateBar}`
  (Fortschritt/Bar/Zertifikat; einziger Schreibzugriff auf den Phase-Fortschritts-Key).
- `shared/speak-text.js` — `svSay.{word,renderSyllables,bySyllables,line}`
  (Silben-/Wort-/Satz-Sprachausgabe mit Highlight; baut auf `voice-picker.js`).
- `shared/exercises.js` — `svFlash.*` (Blitz-Karten; Quiz/Builder bleiben pro Phase).
- `shared/reader.js` — `svReader.makeWordTile` (Wort-Kachel für Silben-Phasen 2 & 3).
- ggf. `shared/chrome-*.html` aus Welle 6 (falls extrahiert).
Falls `README.md` eine Modul-/Dateiliste führt, dort analog ergänzen.

- [ ] **Step 7.3: `index.html` aufräumen (wo sinnvoll)**
Prüfen, ob `index.html` von den neuen Modulen profitiert (`reader-util.js`/
`progress.js`), ohne sein **read-only** Fortschrittsmodell zu verändern. Sein
aggregierendes Modell unterscheidet sich vom *schreibenden* `svProgress` der
Phasen und bleibt eigenständig (bewusste Grenze). Nur **tote Reste** entfernen.

- [ ] **Step 7.4: Voller Verifikationslauf**
**V-BUILD** + **V-TEST** komplett. Zusätzlich Zeilen-Reduktion belegen (**V-REDUZ**):

```bash
for f in phase1/lese-schule.html phase2/phase2-schule.html phase3/phase3-schule.html phase4/phase4-schule.html; do echo "$(wc -l < "$f") $f"; done
```

Erwartet: jede Phase deutlich kürzer als die Ausgangswerte (Ph1 1670, Ph2 1337,
Ph3 1258, Ph4 1374 — gemäß Masterplan Task 7 Step 3).

- [ ] **Step 7.5: Voller V-SNAP über alle vier Phasen** — komplette Checkliste
  (1)–(4) je Phase. Jede bewusste Abweichung gegen die Task-0-Notiz (aus Welle 1)
  abgleichen; es darf **nur** die in Welle 4/5 markierten (keine hörbaren/
  sichtbaren) geben.

- [ ] **Step 7.6: Commit**

```bash
git add sw.js CLAUDE.md README.md
git commit -m "🔧 Refactor-Abschluss: CACHE_VERSION v6→v7 + Doku der neuen shared/-Module"
```

  (ggf. `index.html` mit in den Commit, falls in 7.3 angeräumt.)

- [ ] **Step 7.7: Zusammenführen**
Branch ist fertig. Übergabe an den Nutzer für Review + Merge nach `master`
(Fast-Forward), gemäß Wellen-Workflow. **Nicht** eigenmächtig nach `master` mergen.

## Verifikation dieser Welle (Freigabe-Tor)

- [ ] **V.1: V-BUILD** — 4× `OK`, kein `ERR`, keine Marker-Reste in `dist/`.
- [ ] **V.2: V-TEST** — komplette Suite grün.
- [ ] **V.3: V-REDUZ** — Zeilen-Reduktion je Phase belegt (deutlich unter Baseline).
- [ ] **V.4: V-SNAP** — volle Checkliste (1)–(4) über alle vier Phasen; nur die
  markierten, nicht-hörbaren/-sichtbaren Abweichungen.
- [ ] **V.5: `CACHE_VERSION` = `sv-lesen-v7`** verifiziert (`grep -n CACHE_VERSION sw.js`).
- [ ] **V.6: Doku vollständig** — alle neuen `shared/`-Module in `CLAUDE.md`
  (und ggf. `README.md`) gelistet.

## Erwartete Abweichung

**Nur die in Welle 4/5 dokumentierten, nicht-hörbaren/-sichtbaren.** Diese Welle
selbst ändert kein Anwendungsverhalten (nur `sw.js`-Version, Doku, ggf. Aufräumen).

## Risiko & Gegenmaßnahme

- **PWA-Cache (Haupt-Risiko):** Änderung an gecachten Seiten/`shared/`-Includes
  **ohne** `CACHE_VERSION`-Bump → zurückkehrende/installierte Nutzer sehen die
  *alte* gecachte Version (bereits bei Wellen 1–5 passiert, siehe CLAUDE.md).
  Gegenmaßnahme: Step 7.1 ist Pflicht, V.5 verifiziert sie.
- **Doku-Drift:** neue Module nicht in `CLAUDE.md` → künftige Phasen übernehmen
  den kanonischen Include-Satz nicht korrekt. Gegenmaßnahme: Step 7.2 + V.6.

## Übergabe / Abschluss

Nach Review + Fast-Forward nach `master`: Refaktor „Gemeinsame Lese-Engine" ist
**abgeschlossen**. In jeder Wellen-Datei den Status von *Entwurf* → *Umgesetzt*
setzen; im Masterplan die Tasks 1–7 abhaken. Folge-Option (bewusst *nicht* im
Scope): Quiz/Builder-Vereinheitlichung als eigener Plan, sobald sich `svFlash`
bewährt hat.
