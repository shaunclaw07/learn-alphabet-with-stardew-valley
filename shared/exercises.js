/* shared/exercises.js — geteilte Übungs-Engines.
   Global: svFlash (Blitz-Karten). Quiz/Builder bleiben (noch) pro Phase. */
(() => {
  const F = { deck: [], idx: 0, stars: 0, flipped: false, ids: null, rate: 0.85 };
  function els() { return F.ids; }
  function set(id, txt) {
    const e = document.getElementById(id);
    if (e) e.textContent = txt;
  }
  function renderFlash() {
    const w = F.deck[F.idx];
    F.flipped = false;
    const card = document.getElementById(els().card);
    if (card) card.classList.remove("flipped");
    set(els().word, w.word);
    set(els().emoji, w.emoji);
    set(els().index, F.idx + 1);
  }
  window.svFlash = {
    mount(cfg) {
      F.ids = cfg.elIds;
      F.rate = cfg.rate || 0.85;
      F.deck = window.svShuffle(
        cfg.items.map((it) => ({ word: it[cfg.wordKey], emoji: it[cfg.emojiKey] }))
      );
      F.idx = 0;
      F.stars = 0;
      set(els().stars, "");
      set(els().total, F.deck.length);
      renderFlash();
    },
    read() {
      const w = F.deck[F.idx];
      if (w) window.svSay.word(w.word, F.rate);
    },
    flip() {
      const card = document.getElementById(els().card);
      F.flipped = !F.flipped;
      if (card) card.classList.toggle("flipped", F.flipped);
      if (F.flipped) {
        const w = F.deck[F.idx];
        if (w) window.svSay.word(w.word, F.rate);
      }
    },
    next() {
      F.stars = Math.min(F.deck.length, F.stars + 1);
      set(els().stars, "⭐".repeat(F.stars));
      F.idx++;
      if (F.idx >= F.deck.length) {
        set(els().word, "🏆");
        set(els().emoji, "🎉");
        const card = document.getElementById(els().card);
        if (card) card.classList.add("flipped");
        set(els().index, F.deck.length);
        return;
      }
      renderFlash();
    },
  };
})();
