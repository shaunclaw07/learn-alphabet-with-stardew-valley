# Refactoring „Gemeinsame Lese-Engine" — Wellen-Übersicht

> **Was das ist:** Dieser Ordner (`docs/`) zerlegt das Refactoring „Gemeinsame
> Lese-Engine" in **einzeln umsetzbare Wellen** im etablierten Wellen-Workflow
> (CLAUDE.md): *Plan ausklappen → Plan committen/pushen → Agent im isolierten
> Worktree umsetzen → Diff + Testlauf reviewen → Fast-Forward nach `master`.*
> **Eine Welle = eine Plan-Datei = ein Worktree-Durchlauf.**

## Quelldokumente (gemeinsame Basis jeder Welle)

Jede Welle schöpft ihren Detail-Inhalt aus **beiden** Dokumenten:

1. **Masterplan** — `docs/plan-refactoring-shared-engine.md`
   Der ausführbare Gesamtplan (Tasks 0–7) mit exakten Code-Schnipseln,
   grep-Anker- und Zeilen-Referenzen. **Primärquelle** für „Wie genau?".
2. **Design-Spec** — `docs/superpowers/specs/2026-07-21-refactoring-shared-engine-design.md`
   Ziel-Architektur, Modul-Inventar, Modul-Verträge, Schrittsequenz (6 Schritte)
   und Risiken. **Primärquelle** für „Warum? Welche Verträge?".

Der Masterplan ist code-akkurat (Anker-/Zeilen-Referenzen gegen den Ist-Stand
verifiziert: `#INCLUDE shared/srs.js` an Ph1 `:1082` / Ph2 `:865` / Ph3 `:811` /
Ph4 `:814`; Zeilenzähler 1670/1337/1258/1374; `CACHE_VERSION` = `sv-lesen-v6`).
Zeilenzahlen verschieben sich mit jeder Welle — **immer per `grep` neu
aufsuchen**, die Zahlen sind Start-Anker, keine Festwerte.

## Wellen-Reihenfolge & Mapping

| Welle | Modul / Ergebnis | Masterplan-Task | Design-Schritt | Plan-Datei |
|------:|------------------|-----------------|----------------|------------|
| **1** | `shared/reader-util.js` (`svShuffle`, `svScrollToId`) | Task 1 (+ Task 0 = Vorbereitung) | Schritt 1 (Teil: `shuffle`/`scrollTo`) | `docs/plan-welle-1-reader-util.md` |
| **2** | `shared/progress.js` (`svProgress.*`) | Task 2 | Schritt 2 | `docs/plan-welle-2-progress.md` |
| **3** | `shared/speak-text.js` (`svSay.*`) | Task 3 | Schritt 3 | `docs/plan-welle-3-speak-text.md` |
| **4** | `shared/exercises.js` (`svFlash` — Blitz-Karten) | Task 4 | Schritt 4 *(bewusst auf Flashcard eingegrenzt)* | `docs/plan-welle-4-exercises.md` |
| **5** | `shared/reader.js` (`svReader.makeWordTile`) | Task 5 | Schritt 1 (Teil: `makeTile`) + Schritt 4 | `docs/plan-welle-5-reader-tile.md` |
| **6** | statische Chrome-Blöcke prüfen/extrahieren | Task 6 | Schritt 5 (Chrome) | `docs/plan-welle-6-chrome.md` |
| **7** | `CACHE_VERSION`-Bump + Doku + Gesamtlauf + `index.html`-Aufräumen | Task 7 | Schritt 6 | `docs/plan-welle-7-abschluss.md` |

> **Hinweis zur Granularität:** Der Design-Spec fasst `makeTile`+Chrome u. a.
> anders zusammen als der Masterplan. Die Wellen folgen der **feineren,
> code-akkuraten Masterplan-Gliederung** (Tasks 1–7 = Wellen 1–7), weil dort
> Abhängigkeiten und Reihenfolge schon am echten Code ausgearbeitet sind.
> Setup/Baseline (Masterplan Task 0) ist **keine eigene Welle**, sondern die
> einmalige *Vorbereitung* am Anfang von Welle 1. Die abschließende Doku/
> Cache-Wartung (Masterplan Task 7) **ist** eine eigene Welle (7), da sie einen
> eigenen Committ und das finale Freigabe-Tor bildet.

## Abhängigkeiten (Reihenfolge ist verbindlich)

```
Welle 1 (reader-util) ──▶ Welle 2 (progress) ──▶ Welle 3 (speak-text)
                                                       │
                                  ┌────────────────────┘
                                  ▼
                          Welle 4 (exercises/svFlash) ──▶ Welle 5 (reader/makeWordTile)
                                                                       │
                                                                       ▼
                                                       Welle 6 (chrome) ──▶ Welle 7 (abschluss)
```

- **Welle 1** muss zuerst (brancht & baselinet; liefert `svShuffle` für alle Folgenden).
- **Welle 2–3** sind voneinander unabhängig, beide brauchen aber Welle 1.
- **Welle 4** braucht `svShuffle` + `svSay` (Welle 1 + 3).
- **Welle 5** braucht `svProgress` + `svSay` (Welle 2 + 3).
- **Welle 6** braucht nichts Code-seitig, baut aber auf dem stabilen Stand aller
  Vorgänger auf (sonst wandern sich Marker).
- **Welle 7** ist das Freigabe-Tor: braucht den finalen Stand aus 1–6.

**Empfehlung:** streng sequenziell 1 → 2 → 3 → 4 → 5 → 6 → 7 umsetzen. Zwischen
den Wellen jeweils fast-forward nach `master` (Wellen-Workflow), damit der
nächste Worktree auf dem aktuellen Stand basiert.

## Was Jede Welle einhält (gemeinsame Vorgaben)

Voller Wortlaut der globalen Constraints, der Verifikations-Kommandos
(**V-BUILD / V-TEST / V-SNAP**) und der manuellen Verhaltens-Baseline steht im
**Masterplan** (`docs/plan-refactoring-shared-engine.md`, Abschnitte „Global
Constraints", „Verifikations-Kommandos" und Task 0). Kurzform, gültig für jede
Welle:

- **Immer gegen `dist/` prüfen**, nie gegen Source-HTMLs; vor jeder Prüfung
  `node build.js`.
- **Neuen Shared-Block dreifach registrieren:** (1) Datei in `shared/`,
  (2) `#INCLUDE`-Marker in den Phasen, (3) Eintrag in `build.js` `includes`-Map.
- **Marker-Reihenfolge:** neue Engine-Module **nach** den `#INCLUDE`s von
  `voice-picker.js`, `celebrate.js`, `srs.js` (Abhängigkeit auf `speak`,
  `svCorrect`, `svSrsSortDueFirst` …).
- **Keine neuen `localStorage`-Keys, kein geändertes ID-Schema** (siehe Masterplan).
- **Sprech-Texte kleinschreiben** (`toLowerCase()`), Anlaut-Prinzip, zentrales
  Tempo über `speak(text, base)` / `svRateFor`.
- **Alle Nutzertexte/Kommentare/Commit-Messages auf Deutsch**, Commits mit Emoji.
- **`CACHE_VERSION` in `sw.js` erhöhen** bei Änderung an gecachten Seiten/`shared/`
  Includes. In diesem Refaktor gesammelt in **Welle 7** (Stand: `sv-lesen-v6`).
- **Nicht auf `master` committen** ohne Feature-Branch.
- **Keine Änderung** an Druckversionen, `lehrplan.html`,
  `lesen-lernen-lehrplan.md` oder bestehenden Shared-Bausteinen außer dem
  Einhängen der neuen Module.

## Verifikations-Kommandos (Kurzform — in jeder Welle ausgeführt)

```
V-BUILD:  node build.js  (+ JS-Syntax-Check der gebauten Phasen, siehe Masterplan)
V-TEST:   cd tests && npx playwright test   (Suites: a11y/navigation/progress/pwa/responsive/structure)
V-SNAP:   manuelle Verhaltens-Checkliste (Fortschritt · Audio · Übungen · Dark Mode/Responsive)
```

Exakte Befehle (inkl. Syntax-Check-Snippet) und die V-SNAP-Baseline: Masterplan
oben. Task 0 legt die V-SNAP-Baseline **einmalig** an (in Welle 1 ausgeführt).

## Status-Tracking

Jede Wellen-Datei endet mit einem „Übergabe / Nächste Welle"-Block. Nach
erfolgreicher Welle (Build + Tests + V-SNAP grün + Merge nach `master`): in der
jeweiligen Datei den Status-Kopf von *Entwurf* → *Umgesetzt* setzen und im
Masterplan den entsprechenden Task abhaken.
