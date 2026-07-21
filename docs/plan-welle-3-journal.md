# Plan — Welle 3: Eltern-Lernjournal

> Ausgeklappte TDD-Fassung der Welle-3-Aufgaben aus `docs/masterplan.md`.
> Regel: Test schreiben → fehlschlagen sehen → implementieren → grün → committen.
> **Vor jedem Testlauf:** `node build.js` (Root), dann `cd tests && npx playwright test`.

## Ziel

Das bestehende Eltern-Dashboard in `index.html` um ein **Lernjournal** erweitern,
das die SRS-Daten aus Welle 1 auswertet:

1. **Meisterungs-Karte** — „gemeistert / gesamt" aus `svSrsStats()`.
2. **„Heute üben"-Empfehlung** — Button/Link auf die Phase mit den **meisten
   fälligen Items** (aus `svSrsDue()`, Präfix `pN:` gezählt).
3. **Leerzustand** — sinnvoller Hinweis, wenn noch keine SRS-Daten existieren
   (`total === 0`), statt „0 / 0".

## Gelockte Design-Entscheidungen (nicht abweichen)

- Meisterung kommt aus `svSrsStats()` (`{ total, mastered, due }`).
- „Heute üben" verlinkt auf die Phase mit den meisten fälligen Items.
- `#dashSrs` aus Welle 1 bleibt **unangetastet** (zeigt weiterhin die Fällig-Zahl).
- **Keine** neuen `localStorage`-Keys, keine neue Persistenz.
- Dark-Override in `shared/dark-mode.css`, nicht pro Seite hart kodieren.

## Betroffene Dateien

- Modify: `index.html` (Journal-Block im `.dash-card` + CSS + Logik),
  `shared/dark-mode.css` (Overrides der neuen Flächen).
- Test: `tests/spec/journal.spec.ts`.

---

## Task 1 — Meisterungs-Karte + Leerzustand

**Test (`tests/spec/journal.spec.ts`):**
- `#dashJournal` sichtbar; `#dashMastered` enthält `mastered`/`total` aus
  gesetztem `sv_lesen_srs` (z. B. 1 Box-5 + 1 Box-1 → „1 / 2").
- Leerzustand: ohne `sv_lesen_srs` ist `#dashJournalEmpty` sichtbar und
  `#dashMastered` verborgen.

**Impl:** Journal-Block ins `.dash-card` (`#dashJournal` mit `#dashMastered`,
`#dashJournalEmpty`). Logik liest `svSrsStats()`; `total===0` → Leerhinweis.
CSS + Dark-Override.

**Commit:** `📊 Journal: Meisterungs-Karte + Leerzustand im Eltern-Dashboard`

## Task 2 — „Heute üben"-Empfehlung (fällige Phase)

**Test:**
- Bei fälligen Items in mehreren Phasen zeigt `#dashPractice` (Link) auf die
  Phase mit den meisten fälligen Items (href enthält z. B. `phase2`).
- Ohne fällige Items (`due===0`) ist `#dashPractice` verborgen.

**Impl:** `svSrsDue()` nach `pN:`-Präfix zählen, Phase mit Maximum wählen, deren
`href` setzen. Bei `due===0` ausblenden.

**Commit:** `🎯 Journal: "Heute üben" verlinkt auf die fälligste Phase`

## Task 3 — Masterplan-Update-Protokoll + Doku

- Welle 3 in `docs/masterplan.md` auf ✅; Änderungs-Log + Learnings ergänzen.
- Volle Suite grün.

**Commit:** `📝 Masterplan: Welle 3 (Eltern-Lernjournal) abgeschlossen`
