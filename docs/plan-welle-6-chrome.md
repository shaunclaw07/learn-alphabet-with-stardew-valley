# Welle 6 — HTML-Chrome prüfen/extrahieren — Ausführungsplan

> **Status:** Entwurf (vor Umsetzung).
> **Für agentische Worker:** REQUIRED SUB-SKILL `superpowers:executing-plans`.
> Checkbox-Syntax (`- [ ]`). Welle endet mit grünem Build **und** Tests **und
> eigenem Commit** (auch wenn es ein reiner *Prüf*-Commit ohne Code-Änderung
> ist). Mapping & Abhängigkeiten: `docs/refactoring-shared-engine-wellen-index.md`.

**Quelle & Einordnung**

- **Primär (Wie?):** `docs/plan-refactoring-shared-engine.md` → **Task 6**.
- **Architektur (Warum?):** Design-Spec → **Schritt 5** (Chrome:
  Header/Nav/Eltern-Panel/Zertifikat-Markup extrahieren).
- **Rolle:** Code-seitig unabhängig, baut aber auf dem stabilen Marker-Stand der
  Wellen 1–5 auf (sonst wandern sich Marker). Prüft, welche statischen
  HTML-Blöcke **zeichengleich** über die Phasen sind, und extrahiert nur das
  Risikolose.

**Ziel:** Statisches Chrome-Markup (Header mit Holz-Bordüre, `.voice-wrap`,
Progress-Bar-Gerüst, `#navRow`-Container, `#certSection`-Hülle, Back-Link) auf
zeichengleiche Blöcke prüfen und diese nach `shared/chrome-*.html` auslagern.

> **Wichtige Vorentscheidung:** Header/Sticky-Nav/Eltern-Panel/Zertifikat sind
> **Markup**, das pro Phase in den `<body>` gehört und über `render()` teils
> dynamisch befüllt wird. Ein HTML-`#INCLUDE` lohnt **nur**, wenn die Blöcke
> *wirklich statisch & identisch* sind. Dynamisch befülltes Markup ist **nicht**
> risikolos statisch teilbar. Deshalb ist diese Welle primär ein **Prüf-Task** —
> Extraktion nur, wo Step 1 einen echten identischen Block findet.

**Tech-Stack:** HTML, Node-Build (`build.js`), Playwright.

## Gemeinsame Vorgaben (Kurzform — volle Fassung im Masterplan)

Gegen `dist/` prüfen · `node build.js` vor jeder Prüfung · neuen HTML-Shared-Block
**dreifach** registrieren (Datei `shared/chrome-*.html` · `<!-- #INCLUDE
shared/chrome-*.html -->`-Marker · `build.js` `includes`-Map) · HTML-Marker-Format:
`<!-- #INCLUDE shared/datei -->` · Deutsch+Emoji · keine Änderung an Druckversionen/
Lehrplan/bestehenden Shared-Bausteinen außer Einhängen.

## Verifikations-Kommandos

```
V-BUILD:  node build.js  + JS-Syntax-Check (Snippet s. Masterplan); danach: grep -rn "#INCLUDE" dist/phase*/*.html  ( muss leer sein )
V-TEST:   cd tests && npx playwright test   (hier besonders: structure + a11y)
V-SNAP:   manuelle Checkliste; Chrome-Blöcke pro Phase optisch unverändert (Header, Nav, Back-Link, Stimmen-Picker, Progress-Gerüst)
```

## Datei-Struktur

- **Create (nur falls Step 1 identische Blöcke findet):** `shared/chrome-<name>.html`
- **Modify (nur dann):** `build.js` (`includes`-Map), Phasen (Marker statt Inline-Markup)
- **Im reinen Prüf-Fall:** keine Code-Änderung — leeren Commit mit Begründung.

---

### Task 6: HTML-Chrome — Doku statt Extraktion prüfen

- [ ] **Step 6.1: Statische Chrome-Blöcke vergleichen**
Vergleiche in den vier Phasen die statischen Teile des `<body>` **vor**
`<script>` (Header mit Holz-Bordüre, `.voice-wrap`, Progress-Bar-Gerüst,
`#navRow`-Container, `#certSection`-Hülle):

```bash
for f in phase1/lese-schule.html phase2/phase2-schule.html phase3/phase3-schule.html phase4/phase4-schule.html; do echo "=== $f ==="; sed -n '/<body>/,/<script>/p' "$f" | head -60; done
```

Markiere Blöcke, die **zeichengleich** sind (typische Kandidaten: `.voice-wrap`/
Stimmen-Picker-Hülle, der Back-Link `← Übersicht`, das Progress-Bar-Gerüst).
**Abweichende** Blöcke (unterschiedliche Titel, Emojis, Einheits-Wörter, Nav-
Inhalte) **nicht** anfassen.

- [ ] **Step 6.2: Nur identische Blöcke extrahieren**
Für jeden zeichengleichen Block: nach `shared/chrome-<name>.html` auslagern,
`<!-- #INCLUDE shared/chrome-<name>.html -->` an die Stelle setzen, in `build.js`
registrieren (`"shared/chrome-<name>.html": loadShared("chrome-<name>.html"),`).
Findet Step 1 **keine** wirklich identischen Blöcke → reiner Prüf-Task ohne
Code-Änderung → Step 6.3–6.4 überspringen, in 6.5 leeren Commit mit Begründung.

- [ ] **Step 6.3: V-BUILD** — 4× `OK`, keine `#INCLUDE`-Reste in `dist/` (auch
  keine HTML-Marker: `grep -rn "#INCLUDE" dist/phase*/*.html`).

- [ ] **Step 6.4: V-TEST** — besonders `structure`- und `a11y`-Specs (Back-Link,
  `aria-label`, Header vorhanden).

- [ ] **Step 6.5: Commit** —

```bash
git add -A
git commit -m "♻️ Refactor: identische Chrome-Blöcke nach shared/ (oder: geprüft, keine risikolose Extraktion)"
```

  Bei reinem Prüf-Ergebnis die Commit-Message auf den Prüf-Fall setzen, z. B.:
  `📝 Refactor: Chrome geprüft — keine zeichengleichen Blöcke risikolos teilbar`.

## Verifikation dieser Welle

- [ ] **Step V.1: V-BUILD** — 4× `OK`, keine Marker-Reste (HTML & JS) in `dist/`.
- [ ] **Step V.2: V-TEST** — alle grün (`structure`, `a11y` besonders beachten).
- [ ] **Step V.3: V-SNAP** — Chrome pro Phase optisch unverändert: Header/
  Holz-Bordüre, Sticky-Nav, Eltern-Info-Panel (ⓘ), Progress-Bar-Gerüst,
  Zertifikat-Hülle, Back-Link, Stimmen-Picker — in **beiden** Modi (Light/Dark)
  und bei 320/375/768/1024 px.

## Erwartete Abweichung

**Keine.** Extrahiert wird nur Zeichengleiches; alles Dynamische/Abweichende
bleibt pro Phase. Ist nichts risikolos teilbar, gibt es keine Code-Änderung
(Prüf-Ergebnis) — ebenfalls keine Abweichung.

## Risiko & Gegenmaßnahme

- **Dynamisch befülltes Markup** statisch zu teilen → würde leere/falsche
  Inhalte in `render()` erzeugen. Gegenmaßnahme: nur *statisch identische*
  Blöcke extrahieren (Step 1), alles andere anfassen ist tabu.
- **HTML-Marker-Format:** HTML nutzt `<!-- #INCLUDE … -->` (nicht `//`),
  CSS `/* … */`, JS `// …`. Falsches Format → Marker bleibt als Kommentar
  stehen (in `dist/` per `grep` sofort sichtbar).

## Übergabe / Nächste Welle

Nach Merge: **Welle 7** (Abschluss) — das Freigabe-Tor (`CACHE_VERSION`-Bump,
Doku, Gesamtlauf, `index.html`-Aufräumen). Benötigt den finalen Stand aus 1–6.
