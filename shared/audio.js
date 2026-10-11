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

  let current = null;

  function stop() {
    if (current) {
      try {
        current.onended = current.onerror = null;
        current.pause();
      } catch (_) {
        /* egal */
      }
      current = null;
    }
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

  function speak(text, opts) {
    const o = opts || {};
    stop();
    return new Promise((resolve) => {
      if (!text) return resolve();
      const a = new Audio(url(text));
      current = a;
      let fertig = false;
      const beenden = () => {
        if (fertig) return;
        fertig = true;
        a.onended = null;
        a.onerror = null;
        if (o.onend) o.onend();
        resolve();
      };
      a.onended = beenden;
      a.onerror = () => {
        fehlschlag(text, "Datei nicht ladbar");
        beenden();
      };
      const p = a.play();
      if (p && p.catch) p.catch(() => {
        // 404 oder Autoplay-Sperre — beides darf nicht blockieren.
        fehlschlag(text, "play() abgelehnt");
        beenden();
      });
    });
  }

  /* Spielt Texte/Items streng nacheinander. items: string | {text, ...} */
  async function sequence(items, opts) {
    for (const it of items || []) {
      const t = typeof it === "string" ? it : it && it.text;
      if (t) await speak(t, opts);
    }
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
