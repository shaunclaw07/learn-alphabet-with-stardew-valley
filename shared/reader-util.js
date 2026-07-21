/* shared/reader-util.js — kleine, phasenübergreifende Helfer.
   Global: svShuffle, svScrollToId. Reine Utilities ohne DOM-/State-Annahmen. */
(() => {
  // Fisher-Yates: mischt das Array in place und gibt es zurück.
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // Sanft zu einem Element mit gegebener id scrollen (No-op, wenn es fehlt).
  function scrollToId(id, block) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: block || "start" });
  }
  window.svShuffle = shuffle;
  window.svScrollToId = scrollToId;
})();
