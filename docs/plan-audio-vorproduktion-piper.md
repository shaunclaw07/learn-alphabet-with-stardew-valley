# Welle „Vorproduzierte Audios (Piper)“ — Ausführungsplan

> **Status:** Entwurf (vor Umsetzung).
> **Für agentische Worker:** REQUIRED SUB-SKILL `superpowers:executing-plans`.
> Checkbox-Syntax (`- [ ]`). Welle endet mit grünem Build **und** Tests **und
> eigenem Commit**.
> **Für Claude/Agenten:** Diesen Plan **vor** dem ersten Worker-Push committen,
> sonst basiert der Worktree auf `origin/master` und kennt ihn nicht.

**Quelle & Einordnung**

- **Primär (Warum?):** `CLAUDE.md` → Feature-Roadmap nach den Phasen: Welle 7
  „vorproduzierte Audios“. Ziel des Nutzers: **das Browser-TTS vollständig
  entfernen** und alle Vorlese-Texte als referenzierte Dateien abspielen.
- **Zusatznutzen:** Der Amazon-Kids-Modus gibt die Web Speech API nicht frei —
  bisher blieb das Vorlesen dort komplett leer (`showNoVoices()`). Vorproduzierte
  Audios umgehen diese Geräteabhängigkeit vollständig.
- **Abgrenzung:** Kein Umbau der Phasen-HTMLs, keine neuen Übungen, keine
  Änderung an Lehrplan/Druckversionen.

**Ziel:** Die 225 im Code vorkommenden Vorlese-Strings werden einmalig lokal mit
**Piper** synthetisiert, als MP3 im Repo abgelegt und zur Laufzeit **ohne
Web Speech API** abgespielt. `speechSynthesis` kommt im Code nicht mehr vor.

**Tech-Stack:** Piper (`piper-tts`, Python) + `ffmpeg` (nur beim Generieren),
Node-Build (`build.js`), Vanilla-JS (`shared/audio.js`), Playwright, PWA (`sw.js`).

---

## Global Constraints

- **Sprache:** alle Nutzertexte, Kommentare, Commit-Messages **Deutsch**
  (Emoji-Präfix wie in der Historie: „🔊 Welle Audio: …“).
- **Decodability unverändert:** keine Umlaute/Digraphen im Korpus — deshalb sind
  alle Dateinamen reine ASCII-Slugs, keine Transliteration nötig.
- **Gegen `dist/` prüfen**, nie gegen die Source-HTMLs: `node build.js` vor jeder
  Prüfung.
- **PWA-Pflicht:** `CACHE_VERSION` in `sw.js` erhöhen, sobald gecachte Seiten
  **oder** die Audio-Liste sich ändern. Aktueller Stand: `sv-lesen-v11`.
- **Binär-Gotcha (`build.js`):** `.mp3` wird als Binärdatei **roh** kopiert —
  kein Code-Eingriff nötig, aber im Testlauf nachweisen.
- **Kein `git add -A`** (löscht Dateien). Immer `git add <datei>`.
- **Tests sind das Deploy-Tor:** die CI blockt den Deploy bei rotem Lauf.
- **Verteidigbare Zahlen:** jede Zahl im Abschlussbericht aus einem gefahrenen
  Kommando (Dateianzahl, Bytes, Testzahlen), nicht geschätzt.

**Stimme (Parameter):** Piper-Stimme `<VOICE>` = **noch festzulegen** (Hörproben
`stimmenvergleich.mp3` / `lernprobe.mp3`). Kandidaten: `de_DE-thorsten-high`
(männlich, high), `de_DE-kerstin-low`, `de_DE-ramona-low`, `de_DE-mls-medium`
(multi-speaker). Default bis zur Entscheidung: `de_DE-thorsten-medium`.

---

## Ist-Zustand (belegt durch Code-Analyse)

Alle Vorlese-Aufrufe laufen über **zwei** Module:

| Modul | API | Rolle |
|---|---|---|
| `shared/voice-picker.js` | `speak(text, rate)`, `saySyllable(syl)`, Voice-Picker, Tempo-Slider, `showNoVoices()` | TTS-Ausgabe |
| `shared/speak-text.js` | `svSay.{word,renderSyllables,bySyllables,line}` | Silben-/Wort-/Satz-Sequenzen mit Highlight |

Vorlese-Strings (maschinell gezählt aus den Datenstrukturen der Phase-Dateien):

| Kategorie | unique Strings |
|---|---|
| Buchstaben-Laute | 21 |
| Merkwörter | 21 |
| Silben (inkl. 1-Zeichen-Silben) | 132 |
| Wörter | 63 |
| Satzzeilen | 19 |
| **unique gesamt (nach Dedupe)** | **225** |

Kategorien überschneiden sich: 15 einbuchstabige „Silben“ sind identisch mit den
Buchstaben (in Phase 1 werden sie als Laut gesprochen), 18 Strings sind
gleichzeitig Silbe und Wort (`see`, `hof`, `hund`, `pferd`, `tee`, …).
**Quiz-Distraktoren** (Phase 3 aus `WORDS`, Phase 4 aus `ALL_WORDS`) stammen
ebenfalls aus dem Korpus → **kein dynamischer Vorlese-String existiert**.

Betroffene Tests im Bestand (brechen durch den Umbau):
- `tests/spec/settings.spec.ts` — „svUserRate ist ohne Speicherung 1“,
  „gespeichertes Tempo wird übernommen“, „Tempo-Slider speichert…“
- `tests/spec/structure.spec.ts` — „<phase> hat einen Voice-Picker“
- `tests/spec/progress.spec.ts` — „Voice-Präferenz wird gespeichert“

---

## Datei-Struktur (Ziel)

```
audio/                             NEU — 225 MP3-Slugs (committed, ~1,2 MB)
  ma.mp3  tomate.mp3  hallo-sam.mp3  a.mp3  …
scripts/generate-audio.py          NEU — Generator (Piper + ffmpeg), idempotent
shared/audio.js                    NEU — svAudio.*  (Lookup, Wiedergabe, Sequenz)
shared/voice-picker.js             UMBau — nur noch speak()/saySyllable() als Wrapper
shared/speak-text.js               UMBau — Sequenzen auf onended statt setTimeout
build.js                           ERWEITERN — audio/ → dist/audio/ + Include-Map
sw.js                              ERWEITERN — Audio-Precache + CACHE_VERSION
tests/spec/audio.spec.ts           NEU — Vollständigkeit + Wiedergabe + Fallback
tests/spec/settings.spec.ts        ANPASSEN — Tempo-Tests raus, Lesbarkeit bleibt
tests/spec/structure.spec.ts       ANPASSEN — Voice-Picker-Test ersetzen
tests/spec/progress.spec.ts        ANPASSEN — Voice-Präferenz-Test ersetzen
CLAUDE.md / README.md              DOKU — Audio-Kette, neue Keys
```

**Entscheidungen (mit Begründung):**

1. **Ein Audio pro String, Tempo in der Aufnahme statt `playbackRate`.**
   `playbackRate` mit `preservesPitch` klingt bei 0,7 „wässrig“. Stattdessen wird
   jede Datei direkt kindgerecht langsam synthetisiert:
   `length-scale`: Laut 1,7 · Silbe 1,35 · Wort/Satz 1,15.
   Kommt ein String in zwei Rollen vor (`see`), **gewinnt die langsamste Rolle**
   (ein Audio, keine Rollen-Suffixe) — YAGNI.
   → **Der Tempo-Slider entfällt** (Welle 5 Teil-Rückbau), gespeicherte
   `sv_lesen_rate` wird ignoriert.
2. **225 Einzeldateien statt Bundles.** Granular cachebar, kein Offset-Code,
   Dateiname = `slug(text)` → kein Manifest nötig. 1,2 MB gesamt.
3. **`audio/` wird committed** (nicht in CI erzeugt): Generierung braucht Piper
   und eine 63-MB-Modell-Datei, die nicht in die CI gehört. Der Generator bleibt
   im Repo, damit die Kette reproduzierbar ist.
4. **Slug-Funktion identisch in Python und JS** (lowercase, Leerzeichen → `-`,
   alles außer `[a-z0-9-]` entfernen). Divergenz fängt der Vollständigkeits-Test.

---

## Verifikations-Kommandos

```bash
# Audio-Set erzeugen (idempotent — vorhandene Dateien werden übersprungen)
python3 scripts/generate-audio.py --check      # nur prüfen, was fehlt
python3 scripts/generate-audio.py              # erzeugen

# Build + Tests
node build.js
cd tests && npx playwright test

# Vollständigkeits-Gegenprobe (jede gesprochene Datei existiert + ist erreichbar)
node build.js && ls dist/audio/*.mp3 | wc -l   # muss 225 sein
```

---

## Tasks

### Task 1: Generator + Korpus-Extraktion

**Files:**
- Create: `scripts/generate-audio.py`
- Create: `scripts/audio_corpus.json` (generierte Liste: Text, Rolle, slug)
- Test: `tests/spec/audio.spec.ts` (Vollständigkeit, siehe Task 7)

**Interfaces:**
- Consumes: die Datenstrukturen in `phase1/lese-schule.html` (`letters`, `WS_WORDS`),
  `phase2/…` (`WORDS`, `LEKTIONEN`), `phase3/…` (`WORDS`), `phase4/…` (`SENTENCES`)
- Produces: `audio/<slug>.mp3`, `scripts/audio_corpus.json`
  (`[{text, rolle, slug, length_scale}]`)

#### 🔍 Planung
- Zweck: den Vorlese-Korpus **aus dem Code ableiten** (nicht von Hand pflegen —
  sonst driftet er bei neuen Wörtern). Rolle → `length-scale` (Laut 1,7 /
  Silbe 1,35 / Wort, Satz 1,15).
- Abnahmekriterien: Lauf erzeugt für **jeden** Korpus-Eintrag genau eine Datei;
  zweiter Lauf lädt nichts neu (idempotent); fehlende Dateien nur mit `--check`
  gemeldet, Exit-Code 1.
- Testfälle: Korpus-Zählung (225 unique), Slug-Kollisionsfreiheit, `--check`
  bei fehlender Datei.

#### 💻 Implementierung (TDD)
- [ ] **Step 1:** Extraktion nach dem Muster des Analyse-Skripts: die
  `const <NAME> = [ … ]`-Blöcke der vier Phase-HTMLs per Klammer-Balancing
  lesen und mit `json.loads`-nahem Parser auswerten (kein `eval`).
- [ ] **Step 2:** Mengen bilden und deduplizieren: Buchstaben-Laute (aus
  `laut`-Feld, Fallback `id`), Merkwörter (`spokenWord` = Split an `&`),
  Silben (`silben` + `familie`), Wörter (`WS_WORDS`, `WORDS.id` inkl.
  Satz-Wörter), Sätze (`words.join(" ")`, `antwort.join(" ")`).
  Rolle je String = langsamste vorkommende Rolle.
- [ ] **Step 3:** `slug(text)`: lowercase, Leerzeichen → `-`,
  `re.sub(r"[^a-z0-9-]", "", …)`; leeres Ergebnis → Fehler ausgeben.
- [ ] **Step 4:** Piper aufrufen (`piper -m <VOICE> -f <wav> --length-scale <ls>`,
  Text per stdin), danach `ffmpeg -ac 1 -b:a 64k` → `audio/<slug>.mp3`.
  Vorhandene Dateien überspringen (Idempotenz), WAVs im Temp löschen.
- [ ] **Step 5:** `--check`-Modus: nur fehlende Dateien auflisten, Exit 1.
- [ ] **Step 6:** Gegenprobe ausführen und Zahlen notieren:
  `python3 scripts/generate-audio.py && ls audio/*.mp3 | wc -l`
  Erwartung: **225**, Gesamtgröße ~1,2 MB (aus dem Vorversuch bekannt: 258
  Dateien ≙ 1,33 MB; nach Dedupe weniger).
- [ ] **Step 7:** Commit `🔊 Welle Audio 1: Korpus extrahieren + MP3-Set mit Piper erzeugen`

#### ✅ Review
- [ ] Korpus kommt aus dem Code, keine handgepflegte Wortliste?
- [ ] zweiter Lauf ist ein No-Op (Idempotenz belegt)?
- [ ] Zählt die Gegenprobe exakt 225 Dateien?

---

### Task 2: `shared/audio.js` — Engine ohne Web Speech API

**Files:**
- Create: `shared/audio.js`
- Modify: `build.js` (Include-Map um `shared/audio.js` erweitern)
- Test: `tests/spec/audio.spec.ts`

**Interfaces:**
- Consumes: `audio/<slug>.mp3`
- Produces (global `window.svAudio`):
  - `svAudio.slug(text) -> string`
  - `svAudio.speak(text, opts?) -> Promise<void>` — bricht laufendes Audio ab,
    spielt `audio/<slug>.mp3`; `opts.onend`, `opts.silent`
  - `svAudio.sequence(items, opts?) -> Promise<void>` — `items` = `[{text, ms?}]`,
    spielt streng **nacheinander** bis `ended` (kein `setTimeout`)
  - `svAudio.available(text) -> boolean` — prüft ohne Abspielen (für Tests)
  - `svAudio.stop()`

#### 🔍 Planung
- Zweck: die einzige Stelle im Projekt, die Audio abspielt. Kein
  `speechSynthesis` mehr.
- Abnahmekriterien: `svAudio.speak("tomate")` spielt genau `audio/tomate.mp3`;
  unbekannter Text → `Promise.resolve()` + einmalige Konsolen-Warnung (kein
  Throw, kein Stillstand); `sequence` wartet auf `ended`.
- Testfälle: Slug-Bildung (inkl. Leerzeichen/Silbentrennung), Reihenfolge in
  `sequence`, Abbruch bei neuem `speak`, fehlende Datei.

#### 💻 Implementierung (TDD)
- [ ] **Step 1: RED** — `tests/spec/audio.spec.ts`: Test, der nach dem Build
  `window.svAudio` und korrekte Slugs erwartet (`svAudio.slug("Hallo Sam")` →
  `"hallo-sam"`). Läuft rot.
- [ ] **Step 2: RED bestätigen** — `cd tests && npx playwright test audio.spec.ts`
  → FAIL (`svAudio is not defined`).
- [ ] **Step 3: GREEN** — `shared/audio.js` als IIFE, Muster wie
  `shared/speak-text.js`. Ein `current`-Audio-Objekt; `speak()` stoppt es zuerst.
  Fehlende Datei über `error`-Event → warnen, resolven.
- [ ] **Step 4: GREEN bestätigen** — Lauf grün.
- [ ] **Step 5:** In `build.js` in die `includes`-Map eintragen und in die
  Phase-Dateien den Marker `// #INCLUDE shared/audio.js` **vor**
  `voice-picker.js` setzen (Reihenfolge: audio.js vor den Nutzern).
- [ ] **Step 6:** Commit `🔊 Welle Audio 2: shared/audio.js als TTS-freie Abspiel-Engine`

#### ✅ Review
- [ ] Kein `speechSynthesis` in `shared/audio.js`?
- [ ] Fehlende Datei führt **nicht** zu unbehandelter Rejection?
- [ ] Reihenfolge-Test beweist Nacheinander-Abspielen (nicht parallel)?

---

### Task 3: `speak()` / `saySyllable()` auf `svAudio` umbiegen

**Files:**
- Modify: `shared/voice-picker.js`

**Interfaces:**
- Produces: `speak(text, rate)` → delegiert an `svAudio.speak(text)`;
  `saySyllable(syl)` → `svAudio.speak(String(syl).toLowerCase())`.
  **Signatur bleibt** — die Phase-HTMLs werden nicht angefasst.

#### 🔍 Planung
- Zweck: minimaler Eingriff. Alle Aufrufe in Phase 1–4 bleiben unverändert gültig.
- Abnahmekriterien: `speak`/`saySyllable` existieren weiterhin global; keine
  Phase-Datei wird geändert; der `rate`-Parameter wird akzeptiert, aber nicht
  mehr ausgewertet (Aufnahme-Tempo steckt in der Datei).
- Testfälle: `speak("tomate")` löst Audio aus; `saySyllable("MA")` → `audio/ma.mp3`.

#### 💻 Implementierung (TDD)
- [ ] **Step 1: RED** — Test: `page.evaluate(() => { window.__played = []; HTMLAudioElement.prototype.play = function(){ window.__played.push(this.src); return Promise.resolve(); }; saySyllable("MA"); })` → erwartet `…/audio/ma.mp3`.
- [ ] **Step 2: RED bestätigen** — FAIL.
- [ ] **Step 3: GREEN** — `voice-picker.js` auf Wrapper reduzieren:
  `isGermanVoice`, `updateVoiceStatus`, `buildVoicePicker`, `refreshVoices`,
  `showNoVoices`, `injectReadingSettings` und der `voiceschanged`-Poll
  **entfallen**; `spokenWord(mw)` bleibt (wird in Phase 1 genutzt).
- [ ] **Step 4: GREEN bestätigen.**
- [ ] **Step 5:** Commit `🔊 Welle Audio 3: speak/saySyllable auf svAudio umgestellt`

#### ✅ Review
- [ ] Kein `speechSynthesis` mehr in `voice-picker.js`?
- [ ] `spokenWord` weiter exportiert (Phase 1 hängt daran)?
- [ ] Keine Phase-HTML geändert (`git diff --stat phase*` leer)?

---

### Task 4: Sequenzen (`svSay`) auf `ended` umstellen

**Files:**
- Modify: `shared/speak-text.js`

**Interfaces:**
- Consumes: `svAudio.speak`, `svAudio.sequence`
- Produces: unveränderte Signatur `svSay.{word, renderSyllables, bySyllables, line}`

#### 🔍 Planung
- Zweck: `bySyllables` reiht heute Silben per `setTimeout(step, 620)` — bei
  echten Audios (0,4–0,8 s Länge je Silbe) schneidet das ab oder überlappt.
- Abnahmekriterien: Silben laufen streng sequenziell (Ende der vorigen startet
  die nächste); Highlight (`lit`-Klasse) wandert synchron mit.
- Testfälle: 3-Silben-Wort (`tomate`) — Reihenfolge + Anzahl der Abspielaufrufe;
  Einsilber (`see`) — genau **ein** Aufruf (bestehende Sonderregel bleibt);
  `line()` spricht erst Wörter, dann den Satz.

#### 💻 Implementierung (TDD)
- [ ] **Step 1: RED** — Test mit gepatchtem `HTMLAudioElement.play`, der die
  Aufruf-Reihenfolge für `svSay.bySyllables(["TO","MA","TE"], "TOMATE", null)`
  protokolliert; erwartet `["to","ma","te","tomate"]`.
- [ ] **Step 2: RED bestätigen.**
- [ ] **Step 3: GREEN** — `step()` rekursiv an `speak().then(…)` hängen statt an
  `setTimeout`; `bySyllables`/`line` behalten ihre Parameter
  (`step`, `tail`, `rate` werden zu No-Ops bzw. entfernt).
- [ ] **Step 4: GREEN bestätigen.**
- [ ] **Step 5:** Commit `🔊 Welle Audio 4: Silben-/Satz-Sequenzen auf ended-Events`

#### ✅ Review
- [ ] Kein `setTimeout` mehr für Sprech-Reihenfolge (nur noch fürs Aufräumen der
  Highlight-Klasse)?
- [ ] Einsilber-Sonderfall weiterhin genau ein Aufruf?

---

### Task 5: Tempo-Slider + Voice-Picker-UI zurückbauen

**Files:**
- Modify: `shared/voice-picker.js` (Rest von Task 3)
- Modify: `index.html` (Voice-Bereich in der Startseite, falls vorhanden)
- Modify: `tests/spec/settings.spec.ts`, `tests/spec/structure.spec.ts`,
  `tests/spec/progress.spec.ts`

**Interfaces:**
- Entfällt: `svUserRate()`, `#svRateSlider`, `#voicePick`, `#voiceStatus`,
  `#voiceHint`, Keys `sv_lesen_voice`, `sv_lesen_rate`
- Bleibt: `#svFontToggle` + `sv_lesen_font` (Lesbarkeits-Modus, **nicht**
  TTS-abhängig) und `applyFont()`

#### 🔍 Planung
- Zweck: Die UI-Elemente ohne Funktion dürfen nicht stehen bleiben — sonst
  klickt ein Kind/Elter ins Leere.
- Abnahmekriterien: Kein `#voicePick`/`#svRateSlider` in `dist/`; der
  Schrift-Umschalter ist weiter sichtbar und funktioniert; `.voice-wrap`-Layout
  bleibt intakt (kein leerer Kasten).
- Testfälle: Lesbarkeits-Tests bleiben grün; die drei Tempo-/Voice-Tests sind
  entfernt bzw. durch Audio-Tests ersetzt.

#### 💻 Implementierung (TDD)
- [ ] **Step 1: RED** — In `settings.spec.ts` die drei Tempo-Tests löschen und
  einen Test ergänzen: `#svRateSlider` und `#voicePick` existieren **nicht**
  (`toHaveCount(0)`). Lauf ist rot.
- [ ] **Step 2: RED bestätigen.**
- [ ] **Step 3: GREEN** — Tempo-/Voice-Teil aus `injectReadingSettings`
  entfernen; `<select>`/`<span>`-Markup in den Seiten belassen nur, wenn es für
  die Optik nötig ist (sonst CSS mit anpassen). `progress.spec.ts`-Voice-Test
  durch einen Audio-Test ersetzen; `structure.spec.ts`-Voice-Picker-Test durch
  „Audio-Engine vorhanden (`window.svAudio`)" ersetzen.
- [ ] **Step 4: GREEN bestätigen** — `cd tests && npx playwright test`.
- [ ] **Step 5:** Commit `🔊 Welle Audio 5: Tempo-Slider + Voice-Picker entfernt`

#### ✅ Review
- [ ] Keine verwaisten UI-Elemente/Keys?
- [ ] Schrift-Umschalter nachweislich weiter funktionsfähig (Test grün)?
- [ ] Testzahl vorher/nachher im Commit notiert?

---

### Task 6: Build + PWA-Precache

**Files:**
- Modify: `build.js` (Kopie `audio/` → `dist/audio/`)
- Modify: `sw.js` (`APP_SHELL` erweitern, `CACHE_VERSION` → `sv-lesen-v12`)

**Interfaces:**
- Produces: `dist/audio/*.mp3` (225 Dateien), `dist/` offline vollständig

#### 🔍 Planung
- Zweck: ohne Precache ist der Ton offline weg — und da TTS dann entfernt ist,
  gäbe es **gar keinen** Ton. Häufigster Fehlerfall.
- Abnahmekriterien: `dist/audio/` enthält 225 Dateien; `sw.js` listet alle;
  Offline-Test: Seite laden, Netzwerk kappen, ein Wort antippen — Ton muss kommen.
- Testfälle: Dateizahl in `dist` == Dateizahl in `audio/`; jede in `sw.js`
  gelistete Audio-URL liefert HTTP 200.

#### 💻 Implementierung (TDD)
- [ ] **Step 1: RED** — Test in `audio.spec.ts`: für **jede** in
  `scripts/audio_corpus.json` stehende `slug` gilt `GET /audio/<slug>.mp3` == 200.
  Läuft rot (Precache/Build fehlt).
- [ ] **Step 2: RED bestätigen.**
- [ ] **Step 3: GREEN** — `build.js`: `audio/` rekursiv roh nach `dist/audio/`
  kopieren (Binärpfad). `sw.js`: Audios in die Precache-Liste aufnehmen —
  **ausfallsicher pro Ressource** (bestehendes Muster, kein `addAll`), damit eine
  einzelne fehlende Datei die Installation nicht killt.
- [ ] **Step 4: GREEN bestätigen** — `node build.js && ls dist/audio/*.mp3 | wc -l`.
- [ ] **Step 5:** Offline-Gegenprobe im Browser (DevTools → Offline) und
  Ergebnis notieren. Falls Live-Test nicht möglich: **ehrlich vermerken**, nicht
  als „getestet“ behaupten.
- [ ] **Step 6:** Commit `🔊 Welle Audio 6: Build + PWA-Precache (CACHE v12)`

#### ✅ Review
- [ ] `CACHE_VERSION` erhöht?
- [ ] Precache-Install bricht nicht ab, wenn eine Datei fehlt?
- [ ] 225 Dateien in `dist/audio/` belegt?

---

### Task 7: Fallback + Vollständigkeits-Absicherung

**Files:**
- Modify: `shared/audio.js`
- Test: `tests/spec/audio.spec.ts`

**Interfaces:**
- Produces: `svAudio.speak` bei fehlender Datei → einmalige Konsolen-Warnung,
  Promise resolved; optional sichtbarer Hinweis nur beim **ersten** Fehlschlag.

#### 🔍 Planung
- Zweck: Für ein Kind ist ein stiller Fehlschlag die schlechteste UX („ich tippe,
  nichts passiert“). Gleichzeitig darf ein fehlendes Audio nicht die ganze
  Sequenz sprengen.
- Abnahmekriterien: fehlende Datei → Sequenz läuft weiter, genau eine Warnung,
  kein unbehandelter Fehler in der Konsole.
- Testfälle: unbekannter Slug; Datei mit 404; Sequenz mit einem fehlenden Glied.

#### 💻 Implementierung (TDD)
- [ ] **Step 1: RED** — Test: `svAudio.speak("gibtesnicht")` → resolved, genau
  ein `console.warn`, `page.on("pageerror")` bleibt leer.
- [ ] **Step 2: RED bestätigen.**
- [ ] **Step 3: GREEN** — `error`-Handler + `Set` der bereits gewarnten Slugs.
- [ ] **Step 4: GREEN bestätigen.**
- [ ] **Step 5:** Commit `🔊 Welle Audio 7: Fallback bei fehlender Audiodatei`

#### ✅ Review
- [ ] Genau eine Warnung pro fehlendem Slug (nicht pro Aufruf)?
- [ ] Sequenz bricht nicht ab?

---

### Task 8: Doku + Abschluss

**Files:**
- Modify: `CLAUDE.md` (Audio-Abschnitt, Key-Tabelle, TTS-frei)
- Modify: `README.md` (Tech-Stack, Test-Zahlen, Audio-Hinweis)
- Extern: SecondBrain-Wiki `entities/learn-alphabet-stardew.md`

#### 🔍 Planung
- Zweck: CLAUDE.md beschreibt aktuell ausführlich die Web-Speech-Kette (inkl.
  `showNoVoices`, Kids-Modus-Hinweis). Das wäre nach dem Umbau **falsch** und
  würde den nächsten Agenten in die Irre führen.
- Abnahmekriterien: kein `speechSynthesis`-Abschnitt mehr; neue Audio-Kette
  (Generator → `audio/` → `svAudio` → Precache) dokumentiert; Test-Zahlen aktuell.
- Testfälle: keiner (Doku) — aber Kommando-Beleg für Testzahlen.

#### 💻 Implementierung
- [ ] **Step 1:** Vollen Testlauf fahren und Zahlen notieren:
  `cd tests && npx playwright test` (Anzahl Tests + grün).
- [ ] **Step 2:** CLAUDE.md: Abschnitt „Audio (Vorlesen)“ ersetzen durch
  „Audio (vorproduziert, Piper)“ — Generator, Slug-Konvention, `svAudio`-API,
  `--length-scale`-Tabelle, `sv_lesen_font` bleibt / `sv_lesen_voice`+`sv_lesen_rate`
  entfallen, PWA-Precache-Hinweis.
- [ ] **Step 3:** README.md: Feature-Liste + Test-Zahlen + Hinweis, dass Vorlesen
  offline ohne Gerätestimmen läuft.
- [ ] **Step 4:** Wiki-Eintrag aktualisieren (Stand, Test-Zahlen, Audio-Kette) —
  der Eintrag ist ohnehin veraltet (nennt `CACHE_VERSION sv-lesen-v6`).
- [ ] **Step 5:** Abschlusslauf: `python3 scripts/generate-audio.py --check`
  (Exit 0) · `node build.js` · `npx playwright test` (grün) · Dateizahl-Ausgabe.
- [ ] **Step 6:** Commit `📝 Welle Audio 8: Doku (CLAUDE/README/Wiki) + Abschluss`

#### ✅ Review
- [ ] Kein `speechSynthesis` mehr im Repo (außer Doku-Historie)?
  `grep -rn "speechSynthesis" shared/ phase*/ index.html` → leer?
- [ ] Zahlen im Bericht stammen aus den Kommandos?
- [ ] Alle Tests grün?

---

## Abnahme-Kriterien der Welle

- [ ] `grep -rn "speechSynthesis" shared/ index.html phase*/` liefert **keine**
  Treffer in aktivem Code.
- [ ] `ls audio/*.mp3 | wc -l` == Anzahl Einträge in `scripts/audio_corpus.json`
  == 225 (bzw. die belegte neue Zahl).
- [ ] Jede Datei aus `audio/` liegt nach `node build.js` in `dist/audio/` und
  liefert im Test HTTP 200.
- [ ] Die drei Bestandstests sind ersetzt, `npx playwright test` komplett grün.
- [ ] `CACHE_VERSION` erhöht.
- [ ] CLAUDE.md/README/Wiki beschreiben die Audio-Kette.

## Offene Entscheidung (vor Task 1)

**Piper-Stimme** — Hörproben liegen vor (`stimmenvergleich.mp3`,
`lernprobe.mp3`). Kandidaten: `de_DE-thorsten-high` (männlich, high-Qualität),
`de_DE-kerstin-low`, `de_DE-ramona-low`, `de_DE-pavoque-low`,
`de_DE-mls-medium` (236 Speaker). Weibliche deutsche Piper-Stimmen gibt es nur in
`low`/`x_low`-Qualität — `de_DE-mls-medium` ist die einzige mittlere Qualität mit
weiblichen Speakern. Nach der Wahl: `<VOICE>` in `scripts/generate-audio.py`
eintragen und das Set erneut erzeugen.
