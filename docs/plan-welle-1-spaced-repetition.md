# Welle 1 — Adaptive Wiederholung (Spaced Repetition) — Ausführungsplan

> **Für agentische Worker:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> (empfohlen) oder `superpowers:executing-plans`. Schritte nutzen Checkbox-Syntax
> (`- [ ]`). Nach Abschluss: Update-Protokoll in `docs/masterplan.md` ausführen
> (Welle 1 auf ✅, Änderungs-Log, Learnings).

**Ziel:** Ein Leitner-Spaced-Repetition-System, das pro Item (Buchstabe/Wort)
Sicherheit + Fälligkeit trackt und fällige Wackelkandidaten in den Quizzen
zuerst zeigt.

**Architektur:** Neuer Baustein `shared/srs.js` (reine Logik + `localStorage`).
`celebrate.js` reicht optionale Item-IDs an das SRS durch. Phase 1 (Buchstaben)
und Phase 3 (Wörter) verdrahten Ergebnis + Deck-Sortierung voll; Phase 2/4
melden nur „richtig". `index.html` zeigt die Fälligkeits-Anzahl.

**Tech-Stack:** Vanilla JS, `localStorage`, Playwright.

## Global Constraints

Es gelten alle „Globalen Constraints" aus `docs/masterplan.md`. Für diese Welle
besonders relevant:
- **Nach jeder Code-Änderung `node build.js` (aus dem Projekt-Root), BEVOR Tests
  laufen** — Playwright testet gegen `dist/`, nicht gegen die Source.
- Tests aus `tests/`: `npx playwright test [spec/datei.spec.ts]`.
- Neuen Shared-Block in `build.js` `includes`-Map eintragen; `// #INCLUDE`-Marker
  in jede nutzende Seite.
- Alle Texte/Kommentare/Commits Deutsch.
- Volle Suite muss am Ende grün sein (CI blockt sonst den Deploy).

## Datenmodell

`localStorage`-Key **`sv_lesen_srs`** — Objekt `ItemId → Datensatz`:

```json
{ "p1:M": { "box": 3, "due": "2026-07-25", "seen": 6, "correct": 5 } }
```

- **Item-ID:** `p<phase>:<ID>` (`p1:M`, `p2:HOF`, `p3:KUH`, `p4:g1`).
- **Boxen 1–5**, Intervalle in Tagen: `INTERVALS = [0,0,1,3,7,16]` (Index = Box).
- **richtig:** `box=min(5,box+1)`, `correct++`, `seen++`, `due=heute+INTERVALS[box]`.
- **falsch:** `box=1`, `seen++`, `due=heute`.

## Datei-Struktur

- Create: `shared/srs.js` — SRS-Engine (Logik + API), keine DOM-Abhängigkeit.
- Create: `tests/spec/srs.spec.ts` — Unit- + Integrationstests.
- Modify: `build.js` — `includes`-Map.
- Modify: `shared/celebrate.js` — `svCorrect(itemId?)`, neues `svWrong(itemId?)`.
- Modify: `phase1/lese-schule.html`, `phase3/phase3-schule.html` — IDs + Deck-Sort + `svWrong`.
- Modify: `phase2/phase2-schule.html`, `phase4/phase4-schule.html` — `svCorrect(itemId)`.
- Modify: `index.html` — `// #INCLUDE shared/srs.js`, Fälligkeits-Anzeige.
- Modify: `CLAUDE.md` — `sv_lesen_srs` bei den localStorage-Keys.
- Modify (alle Seiten): `// #INCLUDE shared/srs.js` einbinden.

---

### Task 1: SRS-Engine (`shared/srs.js`)

**Files:**
- Create: `shared/srs.js`
- Modify: `build.js` (includes-Map), `phase1/lese-schule.html` (Marker, als Testträger)
- Test: `tests/spec/srs.spec.ts`

**Interfaces — Produces (global):**
- `svSrsRecord(itemId: string, ok: boolean) → Datensatz` — aktualisiert/legt an.
- `svSrsDue() → string[]` — fällige Item-IDs, niedrigste Box zuerst.
- `svSrsStats() → { total: number, mastered: number, due: number }`.
- `svSrsSortDueFirst(deck: T[], keyFn: (item:T)=>string) → T[]` — fällige zuerst (stabil).

- [ ] **Step 1: `shared/srs.js` schreiben**

```js
/* ===================================================================
   srs.js — Spaced Repetition (Leitner, 5 Boxen). Reine Logik über
   localStorage-Key sv_lesen_srs. Global: svSrsRecord/Due/Stats/SortDueFirst.
   =================================================================== */
(() => {
  if (window.__svSrsReady) return;
  window.__svSrsReady = true;

  const KEY = "sv_lesen_srs";
  const INTERVALS = [0, 0, 1, 3, 7, 16]; // Index = Box (1..5); [0] ungenutzt

  function todayStr(d) {
    d = d || new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }
  function addDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return todayStr(d);
  }
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (_) {
      return {};
    }
  }
  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function record(itemId, ok) {
    if (!itemId) return null;
    const data = load();
    const rec = data[itemId] || {
      box: 1,
      due: todayStr(),
      seen: 0,
      correct: 0,
    };
    rec.seen++;
    if (ok) {
      rec.correct++;
      rec.box = Math.min(5, rec.box + 1);
    } else {
      rec.box = 1;
    }
    rec.due = addDays(INTERVALS[rec.box]);
    data[itemId] = rec;
    save(data);
    return rec;
  }

  function due() {
    const today = todayStr();
    const data = load();
    return Object.keys(data)
      .filter((id) => data[id].due <= today)
      .sort((a, b) => data[a].box - data[b].box);
  }

  function stats() {
    const data = load();
    const ids = Object.keys(data);
    const mastered = ids.filter((id) => data[id].box >= 5).length;
    return { total: ids.length, mastered, due: due().length };
  }

  // Stabile Sortierung: SRS-fällige Items zuerst.
  function sortDueFirst(deck, keyFn) {
    const data = load();
    const today = todayStr();
    const rank = (item) => {
      const rec = data[keyFn(item)];
      return rec && rec.due <= today ? 0 : 1;
    };
    return [...deck].sort((a, b) => rank(a) - rank(b));
  }

  window.svSrsRecord = record;
  window.svSrsDue = due;
  window.svSrsStats = stats;
  window.svSrsSortDueFirst = sortDueFirst;
})();
```

- [ ] **Step 2: In `build.js` registrieren**

In `build.js`, `includes`-Map (nach der `celebrate.js`-Zeile) ergänzen:

```js
  "shared/celebrate.js": loadShared("celebrate.js"),
  "shared/srs.js": loadShared("srs.js"),
```

- [ ] **Step 3: Marker in Phase 1 setzen** (Testträger für die Unit-Tests)

In `phase1/lese-schule.html` direkt nach dem celebrate-Include:

```js
      // #INCLUDE shared/celebrate.js

      // #INCLUDE shared/srs.js
```

- [ ] **Step 4: Test schreiben** — `tests/spec/srs.spec.ts`

```ts
import { test, expect } from "@playwright/test";

// Läuft auf einer Seite, die shared/srs.js einbindet.
test.beforeEach(async ({ page }) => {
  await page.goto("/phase1/lese-schule.html");
  await page.evaluate(() => localStorage.removeItem("sv_lesen_srs"));
});

test.describe("SRS-Engine – Box-Logik", () => {
  test("richtig hebt die Box und setzt due in die Zukunft", async ({ page }) => {
    const rec = await page.evaluate(() => (window as any).svSrsRecord("p1:M", true));
    expect(rec.box).toBe(2);
    expect(rec.seen).toBe(1);
    expect(rec.correct).toBe(1);
    const today = await page.evaluate(() => {
      const d = new Date();
      return (
        d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0")
      );
    });
    expect(rec.due > today).toBe(true); // Box 2 → +1 Tag
  });

  test("falsch setzt die Box auf 1 und due auf heute", async ({ page }) => {
    const rec = await page.evaluate(() => {
      (window as any).svSrsRecord("p1:M", true); // Box 2
      (window as any).svSrsRecord("p1:M", true); // Box 3
      return (window as any).svSrsRecord("p1:M", false); // zurück auf 1
    });
    expect(rec.box).toBe(1);
    const today = await page.evaluate(() => {
      const d = new Date();
      return (
        d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0")
      );
    });
    expect(rec.due).toBe(today);
  });

  test("Box ist bei 5 gedeckelt", async ({ page }) => {
    const box = await page.evaluate(() => {
      for (let i = 0; i < 10; i++) (window as any).svSrsRecord("p1:M", true);
      return (window as any).svSrsRecord("p1:M", true).box;
    });
    expect(box).toBe(5);
  });
});

test.describe("SRS-Engine – Fälligkeit & Sortierung", () => {
  test("svSrsDue liefert nur heute fällige Items, niedrigste Box zuerst", async ({ page }) => {
    const dueIds = await page.evaluate(() => {
      // A: heute fällig (frisch, Box 1, due heute → nach record wird due +1,
      // deshalb direkt in localStorage schreiben)
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({
          "p1:A": { box: 1, due: "2000-01-01", seen: 1, correct: 0 },
          "p1:B": { box: 3, due: "2000-01-01", seen: 3, correct: 3 },
          "p1:C": { box: 5, due: "2999-01-01", seen: 9, correct: 9 },
        }),
      );
      return (window as any).svSrsDue();
    });
    expect(dueIds).toEqual(["p1:A", "p1:B"]); // C ist nicht fällig
  });

  test("svSrsSortDueFirst stellt fällige Items nach vorne", async ({ page }) => {
    const order = await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({ "p1:C": { box: 1, due: "2000-01-01", seen: 1, correct: 0 } }),
      );
      const deck = [{ id: "A" }, { id: "B" }, { id: "C" }];
      return (window as any)
        .svSrsSortDueFirst(deck, (x: any) => "p1:" + x.id)
        .map((x: any) => x.id);
    });
    expect(order[0]).toBe("C"); // einziges fälliges Item zuerst
  });

  test("svSrsStats zählt gesamt/gemeistert/fällig", async ({ page }) => {
    const stats = await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({
          "p1:A": { box: 5, due: "2999-01-01", seen: 9, correct: 9 },
          "p1:B": { box: 1, due: "2000-01-01", seen: 1, correct: 0 },
        }),
      );
      return (window as any).svSrsStats();
    });
    expect(stats.total).toBe(2);
    expect(stats.mastered).toBe(1);
    expect(stats.due).toBe(1);
  });
});
```

- [ ] **Step 5: Bauen + Test laufen lassen**

Run (Projekt-Root): `node build.js`
Run (in `tests/`): `npx playwright test spec/srs.spec.ts`
Expected: alle SRS-Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/srs.js build.js phase1/lese-schule.html tests/spec/srs.spec.ts
git commit -m "✨ SRS: Leitner-Spaced-Repetition-Engine (shared/srs.js) + Tests"
```

---

### Task 2: `celebrate.js` an das SRS koppeln

**Files:**
- Modify: `shared/celebrate.js:257` (svCorrect), nach `svStreakReset` neues `svWrong`.
- Test: `tests/spec/srs.spec.ts` (Integrationsblock ergänzen)

**Interfaces:**
- Consumes: `window.svSrsRecord(itemId, ok)` aus Task 1.
- Produces: `svCorrect(itemId?: string)`, `svWrong(itemId?: string)` (global).

- [ ] **Step 1: Integrationstest schreiben** (an `srs.spec.ts` anhängen)

```ts
test.describe("SRS – Kopplung an celebrate.js", () => {
  test("svCorrect(id) legt einen SRS-Datensatz an", async ({ page }) => {
    const rec = await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_srs");
      (window as any).svCorrect("p1:M");
      return JSON.parse(localStorage.getItem("sv_lesen_srs")!)["p1:M"];
    });
    expect(rec).toBeDefined();
    expect(rec.box).toBe(2);
  });

  test("svWrong(id) setzt die Box zurück auf 1", async ({ page }) => {
    const box = await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_srs");
      (window as any).svCorrect("p1:M"); // Box 2
      (window as any).svWrong("p1:M");   // zurück auf 1
      return JSON.parse(localStorage.getItem("sv_lesen_srs")!)["p1:M"].box;
    });
    expect(box).toBe(1);
  });

  test("svCorrect() ohne id legt keinen SRS-Datensatz an", async ({ page }) => {
    const srs = await page.evaluate(() => {
      localStorage.removeItem("sv_lesen_srs");
      (window as any).svCorrect();
      return localStorage.getItem("sv_lesen_srs");
    });
    expect(srs === null || srs === "{}").toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `node build.js` (Root) · `npx playwright test spec/srs.spec.ts -g "Kopplung"` (tests/)
Expected: FAIL — `svWrong` ist `undefined`, `svCorrect` ignoriert die id.

- [ ] **Step 3: `svCorrect` erweitern** — `shared/celebrate.js`

Ersetze den `svCorrect`-Block:

```js
  window.svCorrect = function (itemId) {
    streak++;
    bumpDaily();
    if (itemId && window.svSrsRecord) window.svSrsRecord(itemId, true);
    dingCorrect();
    confetti(14);
    let msg = randomPraise();
    if (streak >= 3) msg += "  🔥 " + streak + " in Folge!";
    toast(msg);
  };
```

- [ ] **Step 4: `svWrong` ergänzen** — direkt nach `svStreakReset` in `shared/celebrate.js`

```js
  window.svStreakReset = function () {
    streak = 0;
  };

  // Echter Item-Fehler (Kind wusste es nicht): Streak reset + SRS-Box zurück.
  window.svWrong = function (itemId) {
    streak = 0;
    if (itemId && window.svSrsRecord) window.svSrsRecord(itemId, false);
  };
```

- [ ] **Step 5: Test laufen lassen (muss bestehen)**

Run: `node build.js` · `npx playwright test spec/srs.spec.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/celebrate.js tests/spec/srs.spec.ts
git commit -m "✨ SRS: svCorrect(itemId?) + svWrong(itemId?) an SRS koppeln"
```

---

### Task 3: Phase 1 (Buchstaben-Quiz) verdrahten

**Files:**
- Modify: `phase1/lese-schule.html` — `markCorrect` (:1363), `markAgain` (:1370),
  Deck-Aufbau (:1309, :1403).

- [ ] **Step 1: `markCorrect` — Item-ID übergeben**

```js
      function markCorrect() {
        quizCorrectCount++;
        document.getElementById("quizCorrect").textContent = quizCorrectCount;
        svCorrect("p1:" + quizDeck[quizIndex].id);
        advanceQuiz();
      }
```

- [ ] **Step 2: `markAgain` — als Item-Fehler werten**

```js
      function markAgain() {
        svWrong("p1:" + quizDeck[quizIndex].id);
        quizAgainPile.push(quizDeck[quizIndex]);
        advanceQuiz();
      }
```

- [ ] **Step 3: Deck fällige Buchstaben zuerst** — beide `shuffle([...letters])`-Stellen

Ersetze `quizDeck = shuffle([...letters]);` (Zeilen 1309 und 1403) jeweils durch:

```js
        quizDeck = svSrsSortDueFirst(shuffle([...letters]), (l) => "p1:" + l.id);
```

- [ ] **Step 4: Manuell verifizieren (Build + Rendering)**

Run: `node build.js`. Dann `dist/phase1/lese-schule.html` im Browser öffnen,
Quiz spielen: „✓ kann ich" muss `sv_lesen_srs` befüllen (DevTools → Application →
Local Storage: Key `sv_lesen_srs` mit `p1:<Buchstabe>`).

- [ ] **Step 5: Regressions-Suite grün**

Run: `node build.js` · `npx playwright test` → alle grün (Reward-/Progress-Tests
unverändert).

- [ ] **Step 6: Commit**

```bash
git add phase1/lese-schule.html
git commit -m "✨ SRS: Phase 1 Buchstaben-Quiz verdrahtet (IDs, svWrong, Deck-Sort)"
```

---

### Task 4: Phase 3 (Wort-Quiz) verdrahten

**Files:**
- Modify: `phase3/phase3-schule.html` — `pickOption` (:1147 richtig, :1162 falsch),
  Deck-Aufbau (:1109), celebrate/srs-Include.

- [ ] **Step 1: `// #INCLUDE shared/srs.js` in Phase 3 setzen** (nach celebrate-Include)

```js
      // #INCLUDE shared/celebrate.js

      // #INCLUDE shared/srs.js
```

- [ ] **Step 2: richtige Antwort — Item-ID**

Ersetze `svCorrect();` (Zeile ~1157) durch:

```js
          svCorrect("p3:" + target.id);
```

- [ ] **Step 3: falsche Antwort — als Item-Fehler**

Ersetze `svStreakReset();` (Zeile ~1162) durch:

```js
          svWrong("p3:" + target.id);
```

- [ ] **Step 4: Deck fällige Wörter zuerst**

Ersetze `qDeck = shuffle([...WORDS]).slice(0, QUIZ_ROUND);` (Zeile 1109) durch:

```js
        qDeck = svSrsSortDueFirst(shuffle([...WORDS]), (w) => "p3:" + w.id).slice(
          0,
          QUIZ_ROUND,
        );
```

- [ ] **Step 5: Bauen + volle Suite grün**

Run: `node build.js` · `npx playwright test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add phase3/phase3-schule.html
git commit -m "✨ SRS: Phase 3 Wort-Quiz verdrahtet (IDs, svWrong, Deck-Sort)"
```

---

### Task 5: Phase 2 & 4 — „richtig" ans SRS melden

Builder-Übungen haben kein sauberes Item-Fehler-Signal (das Kind probiert bis
richtig), daher **nur** `svCorrect(itemId)` bei Wort-/Satz-Abschluss, **kein**
`svWrong`. Deck-Sortierung hier bewusst außen vor (Builder spielen ohnehin alle
Items durch).

**Files:**
- Modify: `phase2/phase2-schule.html` — `// #INCLUDE shared/srs.js`, Wort-Abschluss.
- Modify: `phase4/phase4-schule.html` — `// #INCLUDE shared/srs.js`, Satz-Abschluss.

- [ ] **Step 1: srs-Include in Phase 2 & 4 setzen** (jeweils nach celebrate-Include)

```js
      // #INCLUDE shared/celebrate.js

      // #INCLUDE shared/srs.js
```

- [ ] **Step 2: Phase 2 — Wort-Abschluss mit ID**

In `phase2/phase2-schule.html`, im Abschluss-Zweig von `pickChip`, ersetze
`svCorrect();` durch:

```js
            svCorrect("p2:" + w.id);
```

- [ ] **Step 3: Phase 4 — Satz-Abschluss mit ID**

In `phase4/phase4-schule.html`, im Abschluss-Zweig von `pickChip` (Satz fertig),
ersetze `svCorrect();` durch:

```js
            svCorrect("p4:" + s.id);
```

- [ ] **Step 4: Bauen + volle Suite grün**

Run: `node build.js` · `npx playwright test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add phase2/phase2-schule.html phase4/phase4-schule.html
git commit -m "✨ SRS: Phase 2 & 4 melden richtige Antworten ans SRS"
```

---

### Task 6: `index.html` — Fälligkeits-Anzeige

**Files:**
- Modify: `index.html` — `// #INCLUDE shared/srs.js`, Dashboard-HTML (#dashSrs),
  Anzeige-Logik im Block nach dem celebrate-Include.
- Test: `tests/spec/srs.spec.ts` (Anzeige-Block)

- [ ] **Step 1: Test schreiben** (an `srs.spec.ts` anhängen)

```ts
test.describe("SRS – Anzeige auf der Startseite", () => {
  test("zeigt fällige Anzahl, wenn Items fällig sind", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() => {
      localStorage.setItem(
        "sv_lesen_srs",
        JSON.stringify({
          "p1:A": { box: 1, due: "2000-01-01", seen: 1, correct: 0 },
          "p1:B": { box: 2, due: "2000-01-01", seen: 2, correct: 1 },
        }),
      );
    });
    await page.reload();
    const el = page.locator("#dashSrs");
    await expect(el).toBeVisible();
    await expect(el).toContainText("2");
  });

  test("bleibt versteckt, wenn nichts fällig ist", async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() => localStorage.removeItem("sv_lesen_srs"));
    await page.reload();
    await expect(page.locator("#dashSrs")).toBeHidden();
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `node build.js` · `npx playwright test spec/srs.spec.ts -g "Startseite"`
Expected: FAIL — `#dashSrs` existiert nicht.

- [ ] **Step 3: srs-Include auf index setzen** — im Script-Block mit dem celebrate-Include

```html
    <script>
      // #INCLUDE shared/celebrate.js
    </script>
    <script>
      // #INCLUDE shared/srs.js
    </script>
```

- [ ] **Step 4: Dashboard-HTML ergänzen** — direkt nach `#dashStreak` in `index.html`

```html
        <div class="dash-streak" id="dashStreak" hidden></div>
        <div class="dash-streak" id="dashSrs" hidden></div>
```

- [ ] **Step 5: Anzeige-Logik** — im Block „Tages-Streak, Reset & Gesamt-Zertifikat",
      nach der Tages-Streak-Anzeige einfügen:

```js
        // Fällige Wiederholungen (SRS)
        try {
          const s =
            typeof svSrsStats === "function" ? svSrsStats() : { due: 0 };
          const srsEl = document.getElementById("dashSrs");
          if (srsEl && s.due > 0) {
            srsEl.innerHTML =
              '<span class="flame">🔁</span> ' +
              s.due +
              (s.due === 1 ? " Übung wartet" : " Übungen warten") +
              " auf Wiederholung";
            srsEl.hidden = false;
          }
        } catch (e) {}
```

- [ ] **Step 6: Bauen + Test grün**

Run: `node build.js` · `npx playwright test spec/srs.spec.ts` → PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html tests/spec/srs.spec.ts
git commit -m "✨ SRS: Fälligkeits-Anzeige im Eltern-Dashboard"
```

---

### Task 7: Dokumentation + Masterplan-Update

**Files:**
- Modify: `CLAUDE.md` (localStorage-Keys), `docs/masterplan.md` (Status/Log/Learnings).

- [ ] **Step 1: `CLAUDE.md` — `sv_lesen_srs` ergänzen**

Bei „Weitere phasenübergreifende Keys" ergänzen:
`sv_lesen_srs` (Spaced-Repetition-Daten, von `shared/srs.js` gepflegt).

- [ ] **Step 2: Masterplan-Update-Protokoll ausführen**

In `docs/masterplan.md`: Welle 1 Status auf `✅`; Änderungs-Log-Zeile mit
Datum + Commit; unter Learnings notieren (neue Keys/Bausteine, Scope-Grenzen
Phase 2/4).

- [ ] **Step 3: Volle Suite ein letztes Mal**

Run: `node build.js` · `npx playwright test` → alle grün.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/masterplan.md
git commit -m "📝 SRS: Doku & Masterplan aktualisiert (Welle 1 fertig)"
```

---

## Self-Review

- **Spec-Abdeckung:** Datenmodell (Task 1), Engine-API (1), celebrate-Kopplung
  (2), Phase-1/3-Vollverdrahtung inkl. Deck-Sort (3/4), Phase-2/4-Recording (5),
  index-Fälligkeitsanzeige (6), Doku (7). ✓
- **Bewusste Scope-Grenze:** Kein cross-phasiger „Wiederholen"-Screen in v1 —
  Wiederholung passiert über Deck-Sortierung *innerhalb* der Quizze + Anzeige auf
  index. Ein eigener Sammel-Screen ist eine spätere Verfeinerung (im Masterplan
  vermerken, falls gewünscht).
- **Typkonsistenz:** `svSrsRecord/Due/Stats/SortDueFirst`, `svCorrect(itemId?)`,
  `svWrong(itemId?)` durchgängig gleich benannt. Item-ID-Schema `p<phase>:<ID>`
  überall identisch.
- **Build-Reihenfolge:** Jeder Test-Schritt nennt `node build.js` vor
  `npx playwright test` (Tests laufen gegen `dist/`).
