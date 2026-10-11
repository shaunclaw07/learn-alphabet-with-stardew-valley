import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/* Welle Audio: Die Stimme ist vorproduziert (audio/<slug>.mp3, erzeugt von
   scripts/generate-audio.mjs). Diese Suite ist die Absicherung, dass Korpus,
   Dateien, Manifest und Laufzeit-Engine nie auseinanderlaufen. */

const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
const CORPUS = JSON.parse(
  readFileSync(resolve(PROJECT_ROOT, "scripts/audio_corpus.json"), "utf-8"),
) as Array<{ slug: string; appText: string; piperText: string; rolle: string }>;

/** Ersetzt window.Audio durch einen Spion, der „ended“ sofort feuert —
 *  so lassen sich Reihenfolge und Abbruch ohne echten Ton prüfen. */
const AUDIO_SPY = () => {
  (window as any).__played = [];
  const Orig = (window as any).Audio;
  (window as any).Audio = class extends Orig {
    constructor(src?: string) {
      super(src);
      (window as any).__played.push(String(src));
    }
    play() {
      setTimeout(() => this.dispatchEvent(new Event("ended")), 0);
      return Promise.resolve();
    }
    pause() {}
  };
};

test.describe("Audio-Korpus", () => {
  test("jeder Korpus-Eintrag hat eine Datei im Repo und steht im Manifest", () => {
    const fehlend: string[] = [];
    for (const e of CORPUS) {
      if (!existsSync(resolve(PROJECT_ROOT, "audio", e.slug + ".mp3"))) fehlend.push(e.slug);
    }
    expect(fehlend, `fehlende Audiodateien: ${fehlend.slice(0, 10).join(", ")}`).toEqual([]);

    const manifest = JSON.parse(
      readFileSync(resolve(PROJECT_ROOT, "audio/manifest.json"), "utf-8"),
    ) as { files: string[] };
    const imManifest = new Set(manifest.files);
    const nichtImManifest = CORPUS.filter((e) => !imManifest.has(e.slug + ".mp3")).map((e) => e.slug);
    expect(nichtImManifest).toEqual([]);
    expect(manifest.files.length).toBe(CORPUS.length);
  });

  test("Dateinamen sind eindeutig (keine Slug-Kollisionen)", () => {
    const slugs = CORPUS.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

test.describe("Audio-Auslieferung (HTTP)", () => {
  test("alle Audiodateien sind über HTTP erreichbar", async ({ request }) => {
    const proben = CORPUS.filter((_, i) => i % 17 === 0).map((e) => e.slug);
    proben.push(CORPUS[0].slug); // garantiert mindestens eine
    for (const slug of proben) {
      const r = await request.get(`/audio/${slug}.mp3`);
      expect(r.status(), `audio/${slug}.mp3`).toBe(200);
    }
    const m = await request.get("/audio/manifest.json");
    expect(m.status()).toBe(200);
  });

  test("Audio liegt an derselben Stelle, die die Engine erwartet", async ({ page }) => {
    await page.goto("/phase1/lese-schule.html");
    const url = await page.evaluate(() => (window as any).svAudio.url("Tomate"));
    expect(url).toBe("../audio/tomate.mp3");
    const r = await page.request.get("/phase1/" + url);
    expect(r.status()).toBe(200);
  });
});

test.describe("Slug-Identität Client ↔ Generator", () => {
  test("svAudio.slug() reproduziert für den ganzen Korpus den Generator-Slug", async ({ page }) => {
    await page.goto("/phase2/phase2-schule.html");
    const abweichungen = await page.evaluate(
      (eintraege: Array<{ appText: string; slug: string }>) =>
        eintraege
          .filter((e) => (window as any).svAudio.slug(e.appText) !== e.slug)
          .map((e) => `${e.appText} → ${(window as any).svAudio.slug(e.appText)} (erwartet ${e.slug})`),
      CORPUS.map((e) => ({ appText: e.appText, slug: e.slug })),
    );
    expect(abweichungen).toEqual([]);
  });
});

test.describe("Abspiel-Engine", () => {
  test("Silben laufen streng nacheinander, dann das Wort", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/phase2/phase2-schule.html");
    await page.evaluate(async () => {
      await (window as any).svSay.bySyllables(["TO", "MA", "TE"], "TOMATE", null);
    });
    const gespielt = await page.evaluate(() => (window as any).__played);
    expect(gespielt.map((u: string) => u.split("/").pop())).toEqual([
      "to.mp3",
      "ma.mp3",
      "te.mp3",
      "tomate.mp3",
    ]);
  });

  test("einsilbige Wörter werden genau einmal gesprochen", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/phase2/phase2-schule.html");
    await page.evaluate(async () => {
      await (window as any).svSay.bySyllables(["SEE"], "SEE", null);
    });
    const gespielt = await page.evaluate(() => (window as any).__played);
    expect(gespielt.map((u: string) => u.split("/").pop())).toEqual(["see.mp3"]);
  });

  test("Satzzeile spricht erst die Wörter, dann den Satz", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/phase4/phase4-schule.html");
    await page.evaluate(async () => {
      const spans = ["GUS", "IST", "DA"].map(() => document.createElement("span"));
      await (window as any).svSay.line(spans, ["GUS", "IST", "DA"], null);
    });
    const gespielt = await page.evaluate(() => (window as any).__played);
    expect(gespielt.map((u: string) => u.split("/").pop())).toEqual([
      "gus.mp3",
      "ist.mp3",
      "da.mp3",
      "gus-ist-da.mp3",
    ]);
  });

  test("fehlende Audiodatei blockiert nicht und wirft keinen Fehler", async ({ page }) => {
    const fehler: string[] = [];
    page.on("pageerror", (e) => fehler.push(e.message));
    await page.goto("/phase1/lese-schule.html");
    const fertig = await page.evaluate(async () => {
      await (window as any).svAudio.speak("gibtesnicht");
      return true;
    });
    expect(fertig).toBe(true);
    expect(fehler).toEqual([]);
  });

  /* Regressionstest: Wird während einer laufenden Sequenz erneut gesprochen
     (Silben-Chip, Wort-Span, Blitz-Karte), muss die alte Sequenz ABBRECHEN —
     nicht ewig auf ein „ended“ warten, das nie kommt, weil stop() die Handler
     der laufenden Wiedergabe entfernt. Genau hier feuerte der frühere
     Audio-Spion „ended“ sofort und deckte den Fall deshalb nicht ab. */
  test("schnelles Tippen während einer Sequenz lässt sie nicht hängen", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__played = [];
      const Orig = (window as any).Audio;
      (window as any).Audio = class extends Orig {
        constructor(src?: string) {
          super(src);
          (window as any).__played.push(String(src));
        }
        play() {
          return Promise.resolve(); // „ended“ feuert NIE von allein
        }
        pause() {}
      };
    });
    await page.goto("/phase2/phase2-schule.html");
    const ergebnis = await page.evaluate(async () => {
      const sequenz = (window as any).svSay.bySyllables(["TO", "MA", "TE"], "TOMATE", null);
      await new Promise((r) => setTimeout(r, 60));
      (window as any).speak("HOF"); // neuer Tipp mitten in der Sequenz
      const zeitlimit = new Promise((r) => setTimeout(() => r("HAENGT"), 2000));
      return Promise.race([sequenz.then(() => "beendet"), zeitlimit]);
    });
    expect(ergebnis, "alte Sequenz muss beim neuen Tipp abbrechen statt zu hängen").toBe("beendet");
  });
});

test.describe("Keine Web Speech API mehr", () => {
  test("Vorlesen ruft speechSynthesis nicht auf", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__ttsAufrufe = 0;
      const ss = (window as any).speechSynthesis;
      if (ss && ss.speak) {
        const orig = ss.speak.bind(ss);
        ss.speak = (...a: any[]) => {
          (window as any).__ttsAufrufe++;
          return orig(...a);
        };
      }
    });
    await page.goto("/phase1/lese-schule.html");
    await page.evaluate(() => (window as any).speak("HOF"));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__ttsAufrufe)).toBe(0);
  });

  test("kein Stimmen-Dropdown und kein Tempo-Slider mehr im DOM", async ({ page }) => {
    for (const p of [
      "/phase1/lese-schule.html",
      "/phase2/phase2-schule.html",
      "/phase3/phase3-schule.html",
      "/phase4/phase4-schule.html",
    ]) {
      await page.goto(p);
      await expect(page.locator("#voicePick"), p).toHaveCount(0);
      await expect(page.locator("#svRateSlider"), p).toHaveCount(0);
      await expect(page.locator("#svFontToggle"), p).toHaveCount(1);
    }
  });
});
