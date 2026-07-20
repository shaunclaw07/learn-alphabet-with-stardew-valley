# CLAUDE.md — Lesen lernen mit Stardew Valley

## Was das ist

Ein deutscher **Lese-Lern-Kurs für ein Kind (5–6 Jahre)**, thematisch komplett
in **Stardew Valley** eingebettet. Kein Framework, kein Build — reine
**self-contained HTML-Dateien**, die per Doppelklick (`file://`) im Browser
laufen. Zielgruppe der Oberfläche ist das Kind; die Eltern-Infos sind
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
| 3 | Stardew-**Wortschatz** | `phase3/…` | 🔒 offen |
| 4 | Erste **Sätze** & Dialoge | `phase4/…` | 🔒 offen |

`index.html` (Root) ist die **Phasenauswahl** — Startbildschirm mit 4 Karten,
zeigt Fortschritt pro Phase, sperrt noch nicht gebaute Phasen als „Bald
verfügbar". Beim Anlegen einer neuen Phase: neue Karte in `index.html`
freischalten (`href` setzen, `soon` entfernen, `progressKey`/`total`/`einheit`
ergänzen).

## Verbindliche Konventionen (für ALLE Phasen)

**Struktur**
- Eine Phase = **eine** self-contained HTML-Datei in eigenem Ordner
  (`phaseN/…-schule.html`). **Alles inline** — CSS und JS in der Datei, keine
  externen Assets, keine gemeinsamen JS/CSS-Dateien. (Die einzige externe
  Abhängigkeit ist die Google-Fonts-`<link>`.)
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

**Audio (Vorlesen)**
- Web Speech API (`speechSynthesis`), offline & kostenlos. Deutsche Stimme hat
  IMMER Vorrang; Voice-Picker + `isGermanVoice()`/`refreshVoices()`/`speak()`
  aus Phase 1/2 **1:1 übernehmen**.
- Gespeicherte Stimme ist **phasenübergreifend**: `localStorage`-Key
  `sv_lesen_voice`.
- Silben/Wörter zum Sprechen **kleinschreiben** (`speak(text.toLowerCase())`) —
  sonst buchstabiert die Stimme Großbuchstaben. Anlaut-Prinzip: das Kind hört
  den Laut im echten Wort, nicht den Buchstaben-Namen.

**Fortschritt**
- Pro Phase ein `localStorage`-Key: `sv_lesen_phase1_progress`,
  `sv_lesen_phase2_progress`, … — JSON-Array der erledigten IDs. `index.html`
  liest diese Keys für die Fortschrittsanzeige; beim Bauen einer Phase den Key
  dort eintragen.

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

## Verifizieren (kein Build/Test-Framework)

- JS-Syntax prüfen (die Chrome-Extension ist oft nicht verbunden):
  ```bash
  node -e 'const fs=require("fs");const h=fs.readFileSync(process.argv[1],"utf8");
  [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new Function(m[1]);
  console.log("script#"+i+" OK")}catch(e){console.log("ERR:",e.message)}});' phaseN/datei.html
  ```
- Danach im Browser öffnen und Konsole prüfen. Live-Test mit „Claude in Chrome"
  nur, wenn die Extension verbunden ist — sonst dem Nutzer sagen, dass der
  visuelle Test aussteht (nichts als „getestet" behaupten, was nicht lief).

## Git

- Commit/Push nur auf ausdrückliche Aufforderung. Commit-Messages: deutsch, mit
  passendem Emoji-Präfix (siehe Historie, z. B. „🧩 Phase 2: …").
- Nicht auf `main`/`master` committen ohne Branch, außer der Nutzer will es.

## Materialien (Papier-Backup)

Neben den Apps gibt es Markdown-Lektionen und druckbare Materialien
(`phase1/lektionen/`, `phase1/materialien/`, `phase1/phase1-druckversion.html`
+ `.pdf`). Phase 1 hat eine druckbare A4-PDF; neue Phasen können analog eine
bekommen. Phase 2 hat noch keine.
