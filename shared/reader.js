/* shared/reader.js — geteilte Wort-Kachel für Silben-Phasen (2 & 3).
   Global: svReader.makeWordTile(w, opts). */
(() => {
  window.svReader = {
    makeWordTile(w, opts) {
      const o = opts || {};
      const tile = document.createElement("div");
      tile.className = "word-tile" + (window.svProgress.has(w.id) ? " done" : "");
      tile.id = "word-" + w.id;

      const emoji = document.createElement("div");
      emoji.className = "word-emoji";
      emoji.textContent = w.emoji;
      emoji.title = "Antippen zum Hören";
      const syll = document.createElement("div");
      syll.className = "word-syllables";
      window.svSay.renderSyllables(syll, w.silben);
      syll.title = "Antippen zum Hören";

      const sylSpans = () => [...syll.querySelectorAll(".syl")];
      const hearIt = () => window.svSay.bySyllables(w.silben, w.id, sylSpans());
      emoji.addEventListener("click", hearIt);
      syll.addEventListener("click", hearIt);
      tile.appendChild(emoji);
      tile.appendChild(syll);

      const hear = document.createElement("div");
      hear.className = "word-hear";
      hear.textContent = o.hearLabel || "🔊 antippen & zusammenlesen";
      tile.appendChild(hear);

      if (o.showBezug && w.bezug) {
        const bezug = document.createElement("div");
        bezug.className = "word-bezug";
        const frag = new DOMParser().parseFromString(w.bezug, "text/html");
        while (frag.body.firstChild) bezug.appendChild(frag.body.firstChild);
        tile.appendChild(bezug);
      }

      const btn = document.createElement("button");
      btn.className = "word-done-btn";
      const done = window.svProgress.has(w.id);
      btn.textContent = done
        ? o.doneLabelOn || "⭐ Kann ich!"
        : o.doneLabelOff || "✋ Kann ich lesen";
      btn.addEventListener("click", () => window.svProgress.toggle(w.id));
      tile.appendChild(btn);
      return tile;
    },
  };
})();
