/* shared/audio.js — zentrale Abspiel-Engine für die vorproduzierten Audios.
   Ersetzt die Web Speech API vollständig: die On-Dateien liegen im Repo
   (audio/<slug>.mp3, erzeugt von scripts/generate-audio.mjs).

   Global: window.svAudio = { slug, url, speak, sequence, stop, available }

   Wichtig: die Abspiel-Reihenfolge hängt am `ended`-Event, NIEMALS an
   setTimeout — Audiolängen schwanken (kurze Silbe 0,4 s, Satz 2 s). */
(() => {
  // Audio liegt in <root>/audio/. Phasen-Seiten liegen in <root>/phaseN/,
  // sind also eine Ebene tiefer. (Läuft auch per file:// — daher relativ.)
  const SUBDIR = /\/(?:phase\d+|lektionen|materialien)\//;
  const PREFIX = SUBDIR.test(location.pathname) ? "../audio/" : "audio/";

  const gewarnt = new Set();

  function slug(text) {
    return String(text)
      .toLowerCase()
      .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c]))
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function url(text) {
    return PREFIX + slug(text) + ".mp3";
  }

  let current = null; // { el, finish } — finish(ok) beendet das laufende speak()

  /* Bricht die laufende Wiedergabe ab UND löst ihr Promise auf (resolve(false)).
     Ohne diesen resolve() bliebe jedes `await speak(...)` in einer Sequenz für
     immer stehen, wenn während der Sequenz erneut gesprochen wird. */
  function stop() {
    const c = current;
    if (!c) return;
    current = null;
    try {
      c.el.onended = c.el.onerror = null;
      c.el.pause();
    } catch (_) {
      /* egal */
    }
    c.finish(false);
  }

  /* Fehlt eine Datei, darf nichts hängen bleiben: einmal warnen, Promise
     auflösen, die Sequenz läuft weiter. Für ein Kind ist Stillstand die
     schlechteste UX. */
  function fehlschlag(slugText, grund) {
    if (!gewarnt.has(slugText)) {
      gewarnt.add(slugText);
      console.warn(`[svAudio] Kein Audio für „${slugText}“ (${grund}).`);
    }
  }

  /* Spielt einen Text. Löst mit true auf (zu Ende gespielt) oder false
     (abgebrochen durch einen neueren Aufruf / fehlende Datei). Sequenzen
     brechen bei false ab, damit ein neuer Tipp nicht sofort überschrieben wird. */
  function speak(text, opts) {
    const o = opts || {};
    stop();
    return new Promise((resolve) => {
      if (!text) return resolve(true);
      const a = new Audio(url(text));
      let fertig = false;
      const beenden = (ok) => {
        if (fertig) return;
        fertig = true;
        if (current && current.el === a) current = null;
        a.onended = null;
        a.onerror = null;
        if (ok && o.onend) o.onend();
        resolve(ok);
      };
      current = { el: a, finish: beenden };
      a.onended = () => beenden(true);
      a.onerror = () => {
        fehlschlag(text, "Datei nicht ladbar");
        beenden(false);
      };
      const p = a.play();
      if (p && p.catch) p.catch(() => {
        // 404 oder Autoplay-Sperre — beides darf nicht blockieren.
        fehlschlag(text, "play() abgelehnt");
        beenden(false);
      });
    });
  }

  /* Spielt Texte/Items streng nacheinander. items: string | {text, ...}
     Rückgabe: false, sobald der Ablauf durch einen neueren speak() abgebrochen
     wurde (der Aufrufer soll dann nichts weiter starten). */
  async function sequence(items, opts) {
    for (const it of items || []) {
      const t = typeof it === "string" ? it : it && it.text;
      if (!t) continue;
      const ok = await speak(t, opts);
      if (!ok) return false;
    }
    return true;
  }

  /* Nur für Tests/Diagnose: liegt die Datei vor? */
  async function available(text) {
    try {
      const r = await fetch(url(text), { method: "HEAD" });
      return r.ok;
    } catch (_) {
      return false;
    }
  }

  window.svAudio = { slug, url, speak, sequence, stop, available };
})();
