/* ===================================================================
   farm.js — Sammel-Farm: Fortschritt schaltet Stardew-Objekte frei.
   Nur Emoji/CSS. localStorage-Key sv_lesen_farm = { unlocked: [keys] }.
   Global: svFarmCatalog / svFarmUnlocked / svFarmSync / svFarmRender.
   =================================================================== */
(() => {
  if (window.__svFarmReady) return;
  window.__svFarmReady = true;

  const KEY = "sv_lesen_farm";
  const PER = 4; // erledigte Aufgaben pro Freischaltung

  const CATALOG = [
    { key: "huhn", emoji: "🐔", label: "Huhn" },
    { key: "karotte", emoji: "🥕", label: "Karotte" },
    { key: "kuh", emoji: "🐄", label: "Kuh" },
    { key: "sonnenblume", emoji: "🌻", label: "Sonnenblume" },
    { key: "schwein", emoji: "🐖", label: "Schwein" },
    { key: "mais", emoji: "🌽", label: "Mais" },
    { key: "schaf", emoji: "🐑", label: "Schaf" },
    { key: "erdbeere", emoji: "🍓", label: "Erdbeere" },
    { key: "hase", emoji: "🐰", label: "Hase" },
    { key: "weizen", emoji: "🌾", label: "Weizen" },
    { key: "ziege", emoji: "🐐", label: "Ziege" },
    { key: "traube", emoji: "🍇", label: "Traube" },
    { key: "hahn", emoji: "🐓", label: "Hahn" },
    { key: "kuerbis", emoji: "🎃", label: "Kürbis" },
    { key: "hund", emoji: "🐕", label: "Hund" },
    { key: "tomate", emoji: "🍅", label: "Tomate" },
    { key: "katze", emoji: "🐱", label: "Katze" },
    { key: "tulpe", emoji: "🌷", label: "Tulpe" },
    { key: "biene", emoji: "🐝", label: "Biene" },
    { key: "apfel", emoji: "🍎", label: "Apfel" },
  ];

  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || "{}");
      return Array.isArray(o.unlocked) ? o.unlocked : [];
    } catch (_) {
      return [];
    }
  }
  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ unlocked: list }));
    } catch (_) {}
  }

  function sync(score) {
    const target = Math.min(CATALOG.length, Math.floor((score || 0) / PER));
    const cur = load();
    if (target <= cur.length) return [];
    const neu = CATALOG.slice(cur.length, target).map((c) => c.key);
    save(cur.concat(neu));
    return neu;
  }

  function render(el) {
    if (!el) return;
    const set = new Set(load());
    el.replaceChildren();
    CATALOG.forEach((c) => {
      const tile = document.createElement("div");
      const on = set.has(c.key);
      tile.className = "farm-tile" + (on ? " on" : "");
      tile.textContent = on ? c.emoji : "❔";
      tile.setAttribute(
        "aria-label",
        on ? c.label + " freigeschaltet" : "noch nicht freigeschaltet",
      );
      el.appendChild(tile);
    });
  }

  window.svFarmCatalog = CATALOG;
  window.svFarmUnlocked = load;
  window.svFarmSync = sync;
  window.svFarmRender = render;
})();
