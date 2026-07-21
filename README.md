# 🐔 Lesen lernen mit Stardew Valley

Ein spielerischer, deutscher **Lese-Lern-Kurs für Kinder (ca. 5–6 Jahre)** —
komplett in die Welt von **Stardew Valley** eingebettet. Jeder Buchstabe, jede
Silbe und jedes Wort ist mit einer Figur oder einem Gegenstand aus dem Spiel
verknüpft, damit das Lesenlernen Spaß macht und im Kopf bleibt.

**🌐 Live:** <http://learn-alphabet-with-stardew-valley.schaflabs.com/>

Die **fertigen** Seiten sind statisch (reine HTML-Dateien) und funktionieren
auch offline per Doppelklick auf `index.html`. Vorgelesen wird über die
**Sprachausgabe des Geräts** (Web Speech API) — offline und kostenlos. Es gibt
einen **Dark Mode** (folgt automatisch der Systemeinstellung) und motivierendes
Feedback: **Konfetti**, ein fröhlicher **Belohnungs-Ton** (abschaltbar) und
**Lob-Sprüche** bei jeder richtigen Antwort, dazu **Serien** („🔥 in Folge"),
einen **Tages-Streak** und ein **Gesamt-Zertifikat**, wenn alle Phasen geschafft
sind.

---

## 📚 Die vier Phasen

| Phase | Fokus | Status |
|-------|-------|--------|
| **1 – Die Buchstaben** | 21 Buchstaben als *Laute* kennenlernen, mit Stardew-Merkwörtern | ✅ fertig |
| **2 – Silben & erste Wörter** | Silben zusammenziehen, erste Wörter lesen (Silben-Bauer, Blitz-Wörter) | ✅ fertig |
| **3 – Wortschatz** | Der ganze Stardew-Wortschatz in 7 Themen (Tiere, Werkzeuge, Pflanzen, Orte …), Bild-Quiz & Blitz-Wörter | ✅ fertig |
| **4 – Erste Sätze** | Kurze Sätze & Mini-Dialoge Wort für Wort lesen (Satz-Bauer, Lücken-Quiz) | ✅ fertig |

Auf der **Startseite** (`index.html`) wählt man die Phase aus und sieht den
eigenen Fortschritt. Jede Phase ist eine eigene Seite mit Vorlese-Funktion
(antippen zum Hören), Quiz/Spielen und einem Zertifikat am Ende. Der Fortschritt
wird lokal im Browser gespeichert (`localStorage`).

---

## 🌟 Extra-Funktionen (über die vier Phasen hinaus)

- **🔁 Kluge Wiederholung** — die App merkt sich pro Buchstabe/Wort, wie sicher
  es sitzt, und spielt fällige Wackelkandidaten in den Quizzen **zuerst**
  (Spaced Repetition). Die Startseite zeigt, wie viele Übungen zur Wiederholung
  fällig sind.
- **✏️ Schreib-Werkstatt** (Phase 1) — Buchstaben mit dem Finger **nachfahren**.
  Der „✏️"-Button erscheint, sobald 5 Buchstaben als „kann ich" markiert sind;
  der Buchstabe muss fast vollständig nachgefahren werden.
- **🌱 Sammel-Farm** — für gelöste Übungen wachsen auf der Startseite nach und
  nach Stardew-Tiere & -Pflanzen (🐔🥕🐄 …).
- **🏅 Eltern-Lernjournal** — die Startseite zeigt, wie viele Übungen schon
  „sicher" sind, plus einen **„🎯 Heute üben"-Link** zur passenden Phase.
- **🐢 Tempo & 🔠 Große Schrift** — im Vorlese-Bereich lässt sich das Vorlese-
  Tempo einstellen und eine größere, luftigere Schrift einschalten. Beides bleibt
  über alle Phasen gespeichert.

> Alle Einstellungen und der Fortschritt bleiben **lokal** im Browser — offline,
> ohne Konto, ohne Werbung.

---

## 🔊 Vorlese-Stimme einrichten (wichtig!)

Die App liest Buchstaben, Silben und Wörter vor. Dafür wird eine **deutsche
Stimme** benötigt — sonst klingen die Laute englisch. Die Stimmen kommen vom
**Betriebssystem**, nicht von der App. Einmal eingerichtet, merkt sich die Seite
die Wahl.

> In der App oben im Feld **„🔊 Vorlese-Stimme"** die deutsche Stimme (🇩🇪,
> `de-DE`) auswählen. Bei **„✅ Aktiv: … de-DE"** ist alles korrekt.

### 💻 Desktop (Chrome / Edge unter Windows)

- **Google Chrome** bringt in der Regel bereits eine **„Google Deutsch"**-Stimme
  mit — einfach oben in der Stimmenauswahl auswählen.
- Falls keine deutsche Stimme auftaucht (z. B. in Edge oder anderen Browsern),
  eine deutsche Windows-Stimme installieren:
  1. `Windows-Einstellungen → Zeit & Sprache → Sprache & Region`
  2. Bei **Deutsch** auf `…` → **Sprachoptionen** → **Sprache/Stimme
     herunterladen**
  3. **Browser neu starten** und die deutsche Stimme in der App auswählen.
- **macOS**: `Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte →
  Systemstimme → Anpassen…` → eine deutsche Stimme laden, danach Browser neu
  starten.

### 📱 Android (Chrome)

Android-Chrome nutzt die **System-Sprachausgabe (Text-to-Speech)**. Die deutsche
Stimme wird also **im Android-TTS-Modul** installiert, nicht in Chrome:

1. **Play Store**: „**Speech Services by Google**" (Sprachausgabe von Google)
   installieren bzw. aktualisieren.
2. **Sprachausgabe-Einstellungen** öffnen (Pfad je nach Gerät):
   - `Einstellungen → System → Sprachen & Eingabe → Sprachausgabe`, oder
   - `Einstellungen → Bedienungshilfen → Sprachausgabe (Text-in-Sprache)`
   - (Notfalls in den Einstellungen nach **„Sprachausgabe"** suchen.)
3. **Bevorzugte Engine** auf **„Speech Services by Google"** stellen
   (Hersteller-Engines wie Samsung haben oft kein Deutsch).
4. Auf das **Zahnrad** neben der Engine → **„Sprachdaten installieren"** →
   **Deutsch** herunterladen (optional in höherer Qualität).
5. **Chrome schließen und neu starten**, Seite neu laden, deutsche Stimme
   auswählen.

**Kommt keine deutsche Stimme?** Prüfen, dass wirklich die *Google*-Engine aktiv
ist; Stimmen brauchen ggf. WLAN + freien Speicher; danach hilft ein **Neustart
des Geräts**.

### 🍎 iOS (Safari / Chrome)

iOS nutzt ebenfalls die Systemstimmen. Unter `Einstellungen → Bedienungshilfen →
Gesprochene Inhalte → Stimmen → Deutsch` eine deutsche Stimme laden.

### 🔥 Amazon Fire Tablet

Zwei Stolperfallen speziell auf Fire-Tablets:

1. **Amazon-Kids-Modus blockiert das Vorlesen.** Der kindersichere Browser im
   Kids-Modus gibt die Web Speech API **nicht** frei — das Stimmen-Dropdown
   bleibt dann leer, egal welche Stimmen installiert sind. Die App im
   **normalen (Erwachsenen-)Profil** im Silk-Browser öffnen. (Die App nur für
   den Kids-Modus freizugeben reicht nicht.)
2. **Deutsche TTS-Stimme.** Unter `Einstellungen → Bedienungshilfen →
   Text-to-Speech-Ausgabe` die Engine und eine deutsche Sprache wählen bzw.
   herunterladen. Fire OS hat ohne Play Store oft nur Englisch — hier ist die
   deutsche Stimme leider zäh.

> Findet die App gar keine Stimme, zeigt sie das jetzt im Klartext an
> („🔇 Kein Vorlesen verfügbar …") statt eines leeren Dropdowns — dann ist
> meist der Kids-Modus die Ursache.

---

## 📲 Als App installieren

Die Seite ist eine **Progressive Web App**: einmal geöffnet, funktioniert sie
komplett **offline** und lässt sich wie eine echte App auf den Startbildschirm
legen.

- **Android / Chrome:** Menü ⋮ → „App installieren" bzw. „Zum Startbildschirm
  hinzufügen" — oder den grünen Button **„📲 Als App hinzufügen"** auf der
  Startseite.
- **iPhone / iPad (Safari):** Teilen-Symbol → „Zum Home-Bildschirm".

Danach startet die Lese-Schule im Vollbild ohne Browser-Leiste. Ein 🐔-Icon
liegt auf dem Startbildschirm.

> Hinweis: Die App-Installation funktioniert nur über die Online-Adresse
> (`https://…`), nicht beim Öffnen per Doppelklick (`file://`). Per Doppelklick
> läuft die Seite aber weiterhin ganz normal.

---

## 🖨️ Zum Ausdrucken

Neben den interaktiven Apps hat **jede Phase eine druckbare A4-Fassung** als
Papier-Backup für unterwegs oder offline. Aufbau jeweils gleich: Deckblatt
(„So funktioniert's") → eine Seite pro Lektion/Thema mit Merkbildern und
Eltern-Tipps → **Ausschneide-Material** → Zertifikat.

| Phase | Druckdatei | Ausschneide-Material |
|-------|-----------|----------------------|
| 1 | [`phase1/phase1-druckversion.html`](phase1/phase1-druckversion.html) · [PDF](phase1/phase1-druckversion.pdf) | 21 Buchstaben-Karteikarten |
| 2 | [`phase2/phase2-druckversion.html`](phase2/phase2-druckversion.html) | 15 Wortkarten |
| 3 | [`phase3/phase3-druckversion.html`](phase3/phase3-druckversion.html) | 28 Wortkarten |
| 4 | [`phase4/phase4-druckversion.html`](phase4/phase4-druckversion.html) | 17 Satzstreifen |

**So druckst du:** Datei im Browser öffnen → `Strg`/`Cmd + P` → drucken oder
**„Als PDF speichern"**. Tipp: im Druckdialog **Hintergrundgrafiken aktivieren**,
damit die farbigen Karten und Badges mitgedruckt werden. Phase 1 liegt zusätzlich
als fertige **PDF** bei.

---

## 🗂️ Projektstruktur

```
alphabet/
├── index.html                     Startseite / Phasenauswahl
├── phase1/
│   ├── lese-schule.html           Phase 1 (interaktiv)
│   ├── lektionen/                 Papier-Lektionen (Markdown)
│   ├── materialien/               Karteikarten, Bingo, Übungsblätter
│   └── phase1-druckversion.*      Druckbare A4-Fassung (HTML + PDF)
├── phase2/
│   ├── phase2-schule.html         Phase 2 (interaktiv)
│   └── phase2-druckversion.html   Phase 2 (druckbar, A4)
├── phase3/
│   ├── phase3-schule.html         Phase 3 (interaktiv)
│   └── phase3-druckversion.html   Phase 3 (druckbar, A4)
├── phase4/
│   ├── phase4-schule.html         Phase 4 (interaktiv)
│   └── phase4-druckversion.html   Phase 4 (druckbar, A4)
├── lehrplan.html                  Kompletter Lehrplan (HTML)
├── lesen-lernen-lehrplan.md       Kompletter Lehrplan (Master-Referenz)
├── shared/                        Geteilte Bausteine (Reader-Engine, Sprach-Helfer, …)
├── CLAUDE.md / AGENTS.md          Konventionen für die Weiterentwicklung
└── .github/workflows/deploy.yml   Auto-Deploy zu GitHub Pages
```

---

## 🛠️ Für Mitwirkende

Alle didaktischen und technischen **Konventionen** stehen in
[`CLAUDE.md`](./CLAUDE.md) (z. B.: eine HTML-Datei pro Phase, Stardew-Design-
Tokens, geteilte `shared/`-Bausteine für Vorlese-Engine, Belohnungen, Dark Mode
und PWA, nur decodierbare Wörter aus den gelernten Buchstaben).

Die Source nutzt geteilte Blöcke; ein kleiner Node-Build fügt sie zu
self-contained Seiten zusammen:

```bash
node build.js          # baut die Seiten nach dist/
cd tests && npm ci && npx playwright install chromium && npx playwright test
```

Jeder Push auf `master` löst die CI aus: erst die **Playwright-Tests**, dann der
Build, dann der **automatische Deploy zu GitHub Pages** (nur wenn die Tests grün
sind).

Die Zusatz-Funktionen der „Wellen 1–5" (kluge Wiederholung, Sammel-Farm,
Eltern-Lernjournal, Schreib-Werkstatt, Tempo & große Schrift) sind umgesetzt und
oben unter **„Extra-Funktionen"** beschrieben. Das verhaltens-erhaltende **Refactoring „Gemeinsame Lese-Engine"**
(Wellen 1–7) ist abgeschlossen (Juli 2026). Die Pläne liegen in
[`docs/plan-refactoring-shared-engine.md`](./docs/plan-refactoring-shared-engine.md).

> **⚠️ Wichtig bei jeder Inhaltsänderung:** Der PWA-Service-Worker cached
> **cache-first**. Wer eine gecachte Seite ändert (Phasen-HTML, `index.html`,
> `lehrplan.html` oder einen `shared/`-Include), **muss `CACHE_VERSION` in
> `sw.js` erhöhen** — sonst sehen zurückkehrende Nutzer weiter die alte Version.

---

*Erstellt mit ❤️ — basierend auf dem offiziellen deutschen
[Stardew-Valley-Wiki](https://de.stardewvalleywiki.com/). Viel Spaß beim
gemeinsamen Lesenlernen! 🌟🐓🥕*
