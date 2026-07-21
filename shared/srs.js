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
