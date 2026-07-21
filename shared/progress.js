/* shared/progress.js — Fortschritt pro Phase (ein localStorage-Key).
   Global: svProgress.{init,has,toggle,size,all,updateBar}.
   Kapselt Laden/Speichern des Fortschritts-Sets, Progress-Bar-Update und
   Zertifikat-Sichtbarkeit. Kein Farm-Sync (der lebt in index.html). */
(() => {
  let cfg = null;
  let completed = new Set();
  function load(key) {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch (e) {
      return new Set();
    }
  }
  function save() {
    localStorage.setItem(cfg.key, JSON.stringify([...completed]));
  }
  function updateBar() {
    const done = completed.size;
    const total = cfg.total;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const fill = document.getElementById("progressFill");
    const label = document.getElementById("progressLabel");
    const cert = document.getElementById("certSection");
    if (fill) fill.style.width = pct + "%";
    if (label)
      label.textContent = done + " von " + total + " " + cfg.einheit + " ⭐";
    if (cert) cert.style.display = done >= total ? "block" : "none";
  }
  window.svProgress = {
    init(config) {
      cfg = config;
      completed = load(config.key);
    },
    has(id) {
      return completed.has(id);
    },
    size() {
      return completed.size;
    },
    all() {
      return [...completed];
    },
    updateBar,
    toggle(id) {
      if (completed.has(id)) completed.delete(id);
      else completed.add(id);
      save();
      if (cfg.onRender) cfg.onRender();
      updateBar();
    },
  };
})();
