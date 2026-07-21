# Masterplan — Lesen lernen mit Stardew Valley

> **Für agentische Worker:** Dies ist ein **lebender Plan**. Implementiere
> **eine Welle nach der anderen** in Reihenfolge. Bevor du eine Welle startest,
> klapp ihre Aufgaben mit der Skill `superpowers:writing-plans` in
> TDD-Einzelschritte aus (Datenmodell + Akzeptanzkriterien stehen schon).
> Nach jeder Welle: **Update-Protokoll** unten befolgen. Schritte nutzen
> Checkbox-Syntax (`- [ ]`).

**Ziel:** Alle langfristig geplanten Features in umsetzbare, unabhängig
testbare Wellen zerlegen, die ein Agent Stück für Stück bauen kann.

**Architektur:** Kein Framework. Source-Dateien mit `#INCLUDE`-Markern aus
`shared/`; `node build.js` inlint zu self-contained HTML in `dist/`. Zustand
in `localStorage`. Neue geteilte Logik = neuer `shared/*.js`-Baustein.

**Tech-Stack:** Vanilla HTML/CSS/JS, Web Speech API (TTS), `localStorage`,
Playwright-Tests, GitHub-Pages-Auto-Deploy.

---

## Globale Constraints (verbindlich für JEDE Welle)

Diese Regeln gelten implizit in jeder Aufgabe. Vollständig in `CLAUDE.md`.

- **Build:** Nie direkt `dist/` bearbeiten. Quelle ändern → `node build.js`.
  Neuen Shared-Block in `shared/` ablegen, per Marker einbinden **und** in
  `build.js` `includes`-Map eintragen. Binärdateien werden roh kopiert (nur
  Text-Endungen laufen durch UTF-8).
- **Geteilte Bausteine:** Jede Seite bindet den kanonischen Satz ein
  (`base.css`, `dark-mode.css`, `voice-picker.js`, `celebrate.js`,
  `pwa-head.html`, `sw-register.js`). Neue Seiten übernehmen ihn 1:1.
- **Decodability:** Kernwortschatz nur aus gelernten Buchstaben
  `M A L O S T E N I R U F H K W B G P D Z J`. **Keine** Digraphen/Umlaute
  (kein SCH, CH, EI, AU, ä/ö/ü, ß) im kind-lesbaren Text.
- **Mobile/A11y:** Touch-Targets ≥44×44px; `:active`-Feedback,
  Hover nur in `@media (hover: hover)`; `prefers-reduced-motion` respektieren;
  `:focus-visible`-Ring; `aria-label` auf Icon-Buttons; Zoom nie sperren;
  `env(safe-area-inset-*)` für Fixed-Elemente.
- **Dark Mode:** Jede neue Farbfläche braucht einen Override in
  `shared/dark-mode.css` (nicht pro Seite hart kodieren).
- **Audio:** Deutsche Stimme hat Vorrang; Silben/Wörter kleinschreiben
  (`speak(text.toLowerCase())`). Stimme phasenübergreifend: `sv_lesen_voice`.
- **Sprache:** Alle Nutzertexte, Kommentare, Commits auf **Deutsch**.
- **Tests (Pflicht vor Push):** `cd tests && npx playwright test` — muss grün
  sein. Die CI blockt den Deploy bei roten Tests. **Jede Welle liefert neue
  Tests mit.**
- **Neue Phasen-Seite:** in `sw.js` `APP_SHELL` eintragen + `CACHE_VERSION`
  erhöhen; Karte in `index.html` freischalten; in die Seiten-Listen der
  relevanten Specs aufnehmen.
- **Commit/Push:** nur auf Aufforderung; Commits deutsch mit Emoji-Präfix.

---

## Update-Protokoll (nach JEDER Welle ausführen)

1. **Status** der Welle unten von `⬜` auf `✅` setzen (bzw. `🔵` während der Arbeit).
2. **Änderungs-Log** (Abschnitt am Ende) um einen Eintrag ergänzen:
   `YYYY-MM-DD — Welle N abgeschlossen — <Commit-Hash> — <1 Satz>`.
3. **Learnings** notieren: Was war anders als geplant? Neue `localStorage`-Keys?
   Neue Shared-Bausteine? → in den Learnings-Abschnitt **und** ggf. in
   `CLAUDE.md`/`README.md` nachziehen.
4. **Nächste Welle prüfen:** Reihenfolge/Abhängigkeiten noch gültig? Ggf.
   umsortieren oder Umfang anpassen (mit Begründung im Log).
5. **Nächste Welle ausklappen:** die High-Level-Aufgaben der jetzt fälligen
   Welle in TDD-Einzelschritte (Test → Fail → Impl → Pass → Commit) überführen.

**Status-Legende:** `⬜ offen` · `🔵 in Arbeit` · `✅ fertig` · `⏸️ zurückgestellt`

---

## Wellen-Überblick

| # | Feature | Wert | Aufwand | Hängt ab von | Status |
|---|---------|------|---------|--------------|--------|
| 1 | Adaptive Wiederholung (Spaced Repetition) | ⭐⭐⭐ | M | — | ✅ |
| 2 | Sammel-Farm (Belohnungs-Progression) | ⭐⭐⭐ | M | 1 (Signale) | ✅ |
| 3 | Eltern-Lernjournal | ⭐⭐ | S–M | 1 (Daten) | ✅ |
| 4 | Buchstaben-Tracing (Schreiben) | ⭐⭐ | M | — | ⬜ |
| 5 | Barrierefreiheit & Tempo | ⭐⭐ | S | — | ⬜ |
| 6 | Kinder-Profile (mehrere Kinder) | ⭐ | S | — | ⬜ |
| 7 | Phase 5 — decodierbare Mini-Geschichten | ⭐⭐ | L | — | ⬜ |
| 8 | Kind liest vor (Spracherkennung) | ⭐⭐⭐? | L / Risiko | Prototyp zuerst | ⬜ |
| 9 | Vorproduzierte Kern-Audios | ⭐⭐ | M / Tradeoff | — | ⬜ |

Empfohlene Reihenfolge = Tabellen-Reihenfolge. Welle 1 ist das Fundament
(liefert die Sicherheits-/Fälligkeits-Signale, die Welle 2 und 3 nutzen).

---

## Welle 1 — Adaptive Wiederholung (Spaced Repetition) ✅

**Ziel:** Statt flacher „erledigt"-Liste merkt die App pro Item (Buchstabe/
Wort/Satz), wie sicher das Kind ist, und spielt fällige Wackelkandidaten
gezielt wieder hoch (Leitner-System).

**Wert:** Größter didaktischer Hebel — Üben wird effizient statt zufällig.
Fundament für Welle 2 (Farm-Signale) und 3 (Journal).

**Ansatz:** Neuer Baustein `shared/srs.js` (Leitner, 5 Boxen). Die Phasen
melden bei jeder Antwort ein Ergebnis an das SRS. Ein **Wiederholungs-Modus**
zieht die heute fälligen Items phasenübergreifend.

**Datenmodell** — neuer Key `sv_lesen_srs` (JSON-Objekt, Item-ID → Datensatz):

```json
{
  "p1:M":   { "box": 3, "due": "2026-07-25", "seen": 6, "correct": 5 },
  "p2:HOF": { "box": 1, "due": "2026-07-21", "seen": 2, "correct": 1 }
}
```

- **Item-ID-Schema:** `p<phase>:<ID>` (z. B. `p1:M`, `p2:HOF`, `p3:KUH`,
  `p4:<satzId>`). Kollisionsfrei über Phasen.
- **Boxen & Intervalle (Tage):** Box1=0, Box2=1, Box3=3, Box4=7, Box5=16.
  Box5 = „gemeistert".
- **Richtig:** `box = min(5, box+1)`, `due = heute + intervall[box]`,
  `seen++`, `correct++`.
- **Falsch:** `box = 1`, `due = heute`, `seen++`.

**Öffentliche API (`shared/srs.js`, global):**

- `svSrsRecord(itemId, ok)` → aktualisiert den Datensatz nach obiger Regel.
- `svSrsDue()` → `string[]` aller Item-IDs mit `due <= heute` (sortiert:
  niedrigste Box zuerst).
- `svSrsStats()` → `{ total, mastered, due }` für Journal/Anzeige.
- Datums-Helfer intern wie in `celebrate.js` (`todayStr()`).

**Integration:** `celebrate.js` `svCorrect(itemId?)` und ein neues
`svWrong(itemId?)` (ersetzt/ergänzt `svStreakReset`) reichen die optionale
Item-ID an `svSrsRecord` weiter. Die Phasen übergeben beim Aufruf die ID des
gerade geübten Items (z. B. `svCorrect("p1:" + l.id)`).

**Betroffene Dateien:**
- Create: `shared/srs.js`
- Modify: `shared/celebrate.js` (Item-ID an SRS durchreichen), `build.js`
  (`includes`-Map), die 4 Phasen-HTMLs (Item-ID an `svCorrect`/`svWrong`),
  `index.html` (Einstieg „🔁 Wiederholen", zeigt `svSrsDue().length`).
- Test: `tests/spec/srs.spec.ts`

**Akzeptanzkriterien:**
- Richtige Antwort hebt die Box, falsche setzt auf Box 1 (Unit-Test der
  Box-Logik via `page.evaluate`).
- `svSrsDue()` liefert nur fällige Items, sortiert nach Box.
- Der Wiederholungs-Modus auf `index.html` zeigt die Anzahl fälliger Items;
  bei 0 fälligen erscheint ein „alles wiederholt"-Zustand.
- Bestehende Progress-/Reward-Tests bleiben grün; `sv_lesen_srs` überlebt Reload.

**High-Level-Aufgaben:** ✅ erledigt — ausführlicher Plan:
`docs/plan-welle-1-spaced-repetition.md`.
- [x] `shared/srs.js` mit Box-Logik + `svSrsRecord/svSrsDue/svSrsStats/svSrsSortDueFirst` + Test.
- [x] In `build.js` registrieren; Marker in den Seiten setzen.
- [x] `celebrate.js`: `svCorrect(itemId?)` + neues `svWrong(itemId?)` an SRS koppeln.
- [x] Phase 1 & 3 voll (IDs + `svWrong` + Deck-Sort); Phase 2 & 4 nur „richtig".
- [x] `index.html`: Fälligkeits-Anzeige (`#dashSrs`); Reset räumt `sv_lesen_srs`.
- [x] `tests/spec/srs.spec.ts` (11 Tests); volle Suite grün (140); `CLAUDE.md` nachgezogen.

---

## Welle 2 — Sammel-Farm (Belohnungs-Progression) ✅

**Ziel:** Fortschritt schaltet Stardew-Tiere/Pflanzen frei, die eine sichtbare
kleine Farm auf `index.html` wachsen lassen.

**Wert:** Stärkster Motivations-Motor für 5–6-Jährige, perfekt zum Thema.

**Datenmodell** — Key `sv_lesen_farm`: `{ "unlocked": ["huhn","karotte", …] }`.
Freischalt-Regeln deterministisch aus vorhandenen Zählern ableitbar (z. B.
alle 5 gemeisterten SRS-Items → 1 neues Farm-Objekt; Meilensteine pro Phase).

**Ansatz:** Neuer Baustein `shared/farm.js` (Freischalt-Logik + Render einer
Farm-Kachelfläche). Nur Emoji/CSS, keine Bild-Assets. Beim Freischalten
`svFinish(...)` (Konfetti) wiederverwenden.

**Betroffene Dateien:**
- Create: `shared/farm.js`
- Modify: `build.js`, `index.html` (Farm-Bereich + Render), ggf.
  `shared/celebrate.js` (Freischalt-Trigger nach `svCorrect`).
- Test: `tests/spec/farm.spec.ts`

**Akzeptanzkriterien:**
- Bei erreichtem Meilenstein wird genau ein neues Objekt zu `sv_lesen_farm`
  hinzugefügt (idempotent — kein Doppel-Freischalten).
- Farm-Bereich rendert die freigeschalteten Objekte; leer bei Start.
- Reset-Button (index) leert auch `sv_lesen_farm`.
- Respektiert `prefers-reduced-motion` (keine Dauer-Animation); Dark-Override.

**High-Level-Aufgaben:** ✅ erledigt — ausführlicher Plan:
`docs/plan-welle-2-farm.md`.
- [x] `shared/farm.js` (Katalog + `svFarmSync/svFarmUnlocked/svFarmRender`) + Test.
- [x] In `build.js` registriert; `// #INCLUDE`-Marker in `index.html` gesetzt.
- [x] Farm-Sektion + CSS + Dark-Override; Sync/Render/Feier-Logik in `index.html`.
- [x] Reset räumt `sv_lesen_farm`.
- [x] `tests/spec/farm.spec.ts` (5 Tests); volle Suite grün (145); Doku nachgezogen.

---

## Welle 3 — Eltern-Lernjournal ✅

**Ziel:** Aus SRS-Daten (Welle 1) ein Eltern-Dashboard: Meisterungs-Karte,
Trend, konkrete „Heute üben"-Empfehlung.

**Wert:** Eltern sind der Motor der Wiederholung — sie brauchen Überblick +
Handlungsempfehlung.

**Ansatz:** Erweiterung des bestehenden Eltern-Dashboards in `index.html`;
liest `svSrsStats()` und `svSrsDue()`. Keine neue Persistenz.

**Betroffene Dateien:**
- Modify: `index.html` (Dashboard-Abschnitt + CSS), `shared/dark-mode.css`.
- Test: `tests/spec/journal.spec.ts`

**Akzeptanzkriterien:**
- Zeigt „gemeistert / gesamt" und Anzahl heute fälliger Items.
- „Heute üben"-Button verlinkt in den Wiederholungs-Modus (Welle 1).
- Bei leerem Zustand sinnvoller Hinweis statt Zahlen-Wirrwarr.

**High-Level-Aufgaben:** ✅ erledigt — ausführlicher Plan:
`docs/plan-welle-3-journal.md`.
- [x] Journal-Block im `.dash-card`: `#dashJournal` mit `#dashMastered`,
  `#dashJournalEmpty`, `#dashPractice` (+ CSS).
- [x] Meisterung „gemeistert / gesamt" aus `svSrsStats()`; Leerzustand bei
  `total===0`.
- [x] „Heute üben" verlinkt auf die Phase mit den meisten fälligen Items
  (`svSrsDue()` nach `pN:`-Präfix gezählt); verborgen bei 0 fälligen.
- [x] Dark-Overrides in `shared/dark-mode.css`; `#dashSrs` (Welle 1)
  unangetastet; keine neuen `localStorage`-Keys.
- [x] `tests/spec/journal.spec.ts` (4 Tests); volle Suite grün (149).

---

## Welle 4 — Buchstaben-Tracing (Schreiben) ⬜

**Ziel:** Neuer Übungstyp in Phase 1: Buchstaben mit dem Finger nachspuren
(Canvas), mit einfachem Treffer-Feedback.

**Wert:** Lesen + Schreiben verstärken sich; Buchstabenform ist in dem Alter
zentral; touch-nativ.

**Ansatz:** `shared/trace.js` (Canvas-Pfad je Buchstabe + Berührungs-Tracking).
Startet über einen neuen Nav-Button in Phase 1, analog zur Lese-Werkstatt.

**Betroffene Dateien:**
- Create: `shared/trace.js`
- Modify: `build.js`, `phase1/lese-schule.html` (Nav-Button + Container).
- Test: `tests/spec/trace.spec.ts`

**Akzeptanzkriterien:**
- Canvas skaliert responsiv, kein horizontaler Scroll bei 320/375px.
- Touch **und** Maus funktionieren; `prefers-reduced-motion` respektiert.
- Abschluss eines Buchstabens ruft `svCorrect("p1:trace:" + id)` (SRS-fähig).

**High-Level-Aufgaben:** Pfad-Datenmodell je Buchstabe · Tracking + Feedback ·
`trace.js` bauen/registrieren · Phase-1-Einbindung · Tests · Doku.

---

## Welle 5 — Barrierefreiheit & Tempo ⬜

**Ziel:** Einstellbare Sprech-Geschwindigkeit, optionale lesefreundliche
Schrift, Silben-Highlighting beim Zusammenschleifen.

**Wert:** Breiter, inklusiver Nutzen bei geringem Aufwand.

**Datenmodell** — Keys `sv_lesen_rate` (Zahl), `sv_lesen_font` (`"nunito"` |
`"lesbar"`). Beide phasenübergreifend, in `voice-picker.js`/`base.css` verankert.

**Betroffene Dateien:**
- Modify: `shared/voice-picker.js` (Rate an `speak()` durchreichen + UI),
  `shared/base.css` (Schrift-Umschaltung via `data`-Attribut am `<html>`),
  `shared/dark-mode.css` bei Bedarf.
- Test: `tests/spec/settings.spec.ts`

**Akzeptanzkriterien:**
- Gewählte Rate/Schrift überleben Reload und wirken auf allen Seiten.
- Standardwerte unverändert, wenn nichts gesetzt ist (keine Regression).

**High-Level-Aufgaben:** Rate-Regler + Persistenz · Schrift-Umschalter ·
Highlighting-Option · Tests · Doku.

---

## Welle 6 — Kinder-Profile ⬜

**Ziel:** Mehrere Kinder auf einem Gerät, jedes mit eigenem Fortschritt.

**Ansatz:** Präfix-Namespacing aller Fortschritts-Keys pro aktivem Profil
(`sv_lesen_<profil>_…`). Profil-Auswahl auf `index.html`. Aktives Profil in
`sv_lesen_active_profile`. **Wichtig:** zentraler Key-Zugriff, damit nicht in
jeder Datei Key-Namen hart stehen — ggf. kleiner `shared/store.js`-Helfer.

**Betroffene Dateien:**
- Create: `shared/store.js` (Key-Auflösung pro Profil)
- Modify: alle Stellen mit direktem `localStorage`-Zugriff auf `sv_lesen_*`,
  `index.html` (Profil-Umschalter).
- Test: `tests/spec/profiles.spec.ts`

**Akzeptanzkriterien:**
- Profil A und B haben getrennten Fortschritt; Umschalten lädt korrekt.
- Migration: bestehende `sv_lesen_*`-Daten werden Profil „Standard" zugeordnet.

**High-Level-Aufgaben:** `store.js` + Migration · alle Zugriffe umstellen ·
Profil-UI · Tests · Doku. *(Aufwand steigt, wenn erst nach vielen Keys gebaut —
Reihenfolge bewusst prüfen.)*

---

## Welle 7 — Phase 5: decodierbare Mini-Geschichten ⬜

**Ziel:** Neue Phase mit kurzen, ausschließlich decodierbaren Stardew-
Geschichten (nur gelernte Buchstaben) — Brücke zum echten „Bücher lesen".

**Ansatz:** Neue Seite `phase5/phase5-schule.html` nach dem kanonischen Muster.
Beachtet die **komplette „Neue Phase"-Checkliste** aus den Globalen Constraints
(APP_SHELL, `CACHE_VERSION`, `index.html`-Karte, Shared-Includes, Test-Listen).

**Betroffene Dateien:**
- Create: `phase5/phase5-schule.html`, `phase5/phase5-druckversion.html`
- Modify: `sw.js`, `index.html`, `lesen-lernen-lehrplan.md`, `lehrplan.html`,
  Seiten-Listen in `tests/spec/*` (a11y, navigation, responsive, structure).
- Test: Erweiterung bestehender Specs + optional `tests/spec/phase5.spec.ts`

**Akzeptanzkriterien:**
- Alle Geschichten sind decodierbar (Lint/Test gegen den Buchstaben-Satz).
- Vollständige Phasen-Konventionen erfüllt (Back-Link, Voice-Picker,
  Reward-Hooks, Dark Mode, Responsive, PWA-Cache).

**High-Level-Aufgaben:** Geschichten schreiben (decodierbar) · Seite bauen ·
PWA/Index/Lehrplan/Tests nachziehen · Druckversion · Doku.

---

## Welle 8 — Kind liest vor (Spracherkennung) ⬜ / Risiko

**Ziel:** Das Kind liest laut, die App gibt Rückmeldung (`SpeechRecognition`).

**Wert:** Potenziell riesig (die fehlende Hälfte des Lesenlernens) — **aber
technisch riskant**: deutsche Kinderstimmen-Erkennung ist unzuverlässig,
offline kaum verfügbar, Browser-Support uneinheitlich.

**Vorgehen (Pflicht):** **Erst Wegwerf-Prototyp** (Skill
`mattpocock-skills:prototype`) auf dem Zielgerät. Nur wenn die Trefferquote mit
Kinderstimme brauchbar ist, in eine echte Welle überführen. Sonst `⏸️`.

**Akzeptanzkriterien (Prototyp):** dokumentierte Trefferquote mit echter
Kinderstimme auf dem Zielgerät; klare Go/No-Go-Empfehlung im Änderungs-Log.

**High-Level-Aufgaben:** Prototyp · Messung · Entscheidung dokumentieren ·
(bei Go) Welle ausdetaillieren.

---

## Welle 9 — Vorproduzierte Kern-Audios ⬜ / Tradeoff

**Ziel:** Für die Kern-Laute/Merkwörter echte Audiodateien statt TTS —
löst das größte Support-Problem (fehlende deutsche Stimme, Amazon-Kids-Modus).

**Tradeoff:** Kollidiert mit „self-contained, keine Assets" und vergrößert den
PWA-Cache. Vor Umsetzung bewusst abwägen und in `CLAUDE.md` als Ausnahme
dokumentieren. Binärdateien werden von `build.js` bereits korrekt roh kopiert.

**Ansatz:** Audio-Dateien unter `audio/`, in `APP_SHELL` cachen (`CACHE_VERSION`
erhöhen). `voice-picker.js`/`speak()` bevorzugt vorhandene Aufnahme, fällt sonst
auf TTS zurück.

**Akzeptanzkriterien:**
- Fällt sauber auf TTS zurück, wenn keine Aufnahme existiert.
- Assets landen unbeschädigt in `dist/` (Integritäts-Test wie `assets.spec.ts`).

**High-Level-Aufgaben:** Fallback-Mechanik · Audios einbinden/cachen ·
Integritäts-Tests · Doku/Ausnahme in `CLAUDE.md`.

---

## Änderungs-Log

| Datum | Welle | Commit | Notiz |
|-------|-------|--------|-------|
| 2026-07-21 | — | — | Masterplan angelegt. |
| 2026-07-21 | 1 | `feature/srs-welle-1` | Spaced Repetition umgesetzt (7 Tasks, +11 Tests → 140 grün). |
| 2026-07-21 | 2 | `feature/farm-welle-2` | Sammel-Farm umgesetzt (3 Tasks, +5 Tests → 145 grün). Freischalt-Regel `floor(totalDone/4)` statt „5 gemeisterte SRS-Items". |
| 2026-07-21 | 3 | `feature/journal-welle-3` | Eltern-Lernjournal umgesetzt (+4 Tests → 149 grün). Meisterung aus `svSrsStats()`, „Heute üben" verlinkt fälligste Phase; keine neuen Keys. |

## Learnings (nach jeder Welle ergänzen)

- **Welle 1:** Neuer Key `sv_lesen_srs`; neuer Baustein `shared/srs.js`. Neue
  globale API `svWrong(itemId?)` ergänzt `svStreakReset` (Streak-only bleibt für
  Builder-Stolperer). `svSrsSortDueFirst` reordert Quiz-Decks fällige-zuerst.
- **Bewusste Scope-Grenze:** kein cross-phasiger „Wiederholen"-Screen — die
  Wiederholung läuft über Deck-Sortierung *in* den Quizzen (Phase 1 & 3) + eine
  Fälligkeits-Anzeige auf `index.html`. Builder (Phase 2/4) melden nur „richtig"
  (kein sauberes Item-Fehler-Signal). Ein eigener Sammel-Screen wäre eine
  spätere Verfeinerung.
- Reset-Button auf `index.html` räumt jetzt auch `sv_lesen_srs`.
- **Welle 2:** Neuer Key `sv_lesen_farm` (`{unlocked:[keys]}`); neuer Baustein
  `shared/farm.js` (nur `index.html`). **Bewusste Design-Abweichung** ggü. der
  Spec „5 gemeisterte SRS-Items": Freischalt-Regel ist
  `target = min(Katalog, floor(totalDone/4))` — `totalDone` = Summe der
  erledigten Aufgaben über alle Phasen (die Zahl, die das Eltern-Dashboard schon
  berechnet). Grund: schnelleres, sichtbares Feedback fürs Kind + kein zwingender
  SRS-Nutzung nötig. Katalog = 20 feste Emoji-Objekte (Stardew-Tiere/-Pflanzen).
- Anzeige zeigt immer das ganze Gitter (gesperrt = `❔`, gedimmt); Feier bei neu
  Freigeschaltetem via `svFinish(...)`, **einmal pro Sitzung**
  (`sessionStorage`-Flag `sv_farm_shown`). Reset-Button räumt jetzt auch
  `sv_lesen_farm`.
- **Welle 3:** **Keine** neuen `localStorage`-Keys, **kein** neuer Shared-Baustein
  — reine Erweiterung des Eltern-Dashboards in `index.html`, das `svSrsStats()`
  und `svSrsDue()` (Welle 1) liest. Neue DOM-IDs: `#dashJournal`,
  `#dashMastered`, `#dashJournalEmpty`, `#dashPractice`. `#dashSrs` (Welle 1)
  bleibt unangetastet.
- „Heute üben" wählt die Phase mit den meisten fälligen Items über das
  Item-ID-Präfix `p<phase>:` aus `svSrsDue()` — robust auch für spätere Item-IDs
  (z. B. `p1:trace:*`), da nur die Phasennummer zählt.
- **CSS-Gotcha:** Ein per `hidden`-Attribut versteckter Button wird durch eine
  eigene `display:`-Regel (`.dj-practice{display:inline-flex}`) wieder sichtbar —
  die UA-Regel `[hidden]{display:none}` verliert. Fix: explizites
  `.dj-practice[hidden]{display:none}`. Merke für künftige toggelbare Buttons.
