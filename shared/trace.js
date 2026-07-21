/* ===================================================================
   trace.js — Buchstaben nachspuren (Font-Glyph + Abdeckung).
   Global: window.svTrace = { start, markAt, coverage, reset, _cells, _done }.
   Abschluss meldet ans SRS: svCorrect("p1:trace:" + id).
   =================================================================== */
(() => {
  if (window.__svTraceReady) return;
  window.__svTraceReady = true;

  const GRID = 24; // Rasterauflösung für die Abdeckung
  const THRESHOLD = 0.95; // nötiger Anteil bedeckter Buchstaben-Zellen (fast vollständig nachfahren)
  const BRUSH = 1; // zusätzlicher Zell-Radius je Malpunkt

  let cv = null;
  let ctx = null;
  let cssSize = 0;
  let targetCells = [];
  let coveredSet = null;
  let curId = null;
  let curChar = null;
  let done = false;
  let onDone = null;

  function buildTargetCells(letter) {
    const off = document.createElement("canvas");
    off.width = GRID;
    off.height = GRID;
    const o = off.getContext("2d");
    o.clearRect(0, 0, GRID, GRID);
    o.fillStyle = "#000";
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.font =
      "800 " + Math.floor(GRID * 0.82) + 'px "Nunito", system-ui, sans-serif';
    o.fillText(letter, GRID / 2, GRID / 2 + GRID * 0.06);
    const d = o.getImageData(0, 0, GRID, GRID).data;
    const cells = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (d[(y * GRID + x) * 4 + 3] > 40) cells.push({ gx: x, gy: y });
      }
    }
    return cells;
  }

  function drawGuide() {
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.save();
    ctx.fillStyle = "rgba(122,168,80,0.18)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      "800 " +
      Math.floor(cssSize * 0.82) +
      'px "Nunito", system-ui, sans-serif';
    ctx.fillText(curChar, cssSize / 2, cssSize / 2 + cssSize * 0.06);
    ctx.restore();
  }

  function coverage() {
    if (!targetCells.length) return 0;
    let hit = 0;
    for (const c of targetCells) {
      if (coveredSet.has(c.gx + "," + c.gy)) hit++;
    }
    return hit / targetCells.length;
  }

  function markAt(x, y) {
    if (done || !cv || !cssSize) return;
    const gx = Math.floor((x / cssSize) * GRID);
    const gy = Math.floor((y / cssSize) * GRID);
    for (let dy = -BRUSH; dy <= BRUSH; dy++) {
      for (let dx = -BRUSH; dx <= BRUSH; dx++) {
        coveredSet.add(gx + dx + "," + (gy + dy));
      }
    }
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.arc(x, y, cssSize * 0.045, 0, Math.PI * 2);
    ctx.fill();
    if (coverage() >= THRESHOLD) complete();
  }

  function complete() {
    if (done) return;
    done = true;
    if (curId && window.svCorrect) window.svCorrect("p1:trace:" + curId);
    if (typeof onDone === "function") onDone(curId);
  }

  function start(id, letter, canvas, doneCb) {
    cv = canvas;
    ctx = cv.getContext("2d");
    onDone = doneCb || null;
    curId = id;
    curChar = String(letter);
    done = false;
    coveredSet = new Set();
    targetCells = buildTargetCells(curChar);
    const rect = cv.getBoundingClientRect();
    cssSize = Math.max(1, Math.round(rect.width));
    const dpr = window.devicePixelRatio || 1;
    cv.width = cssSize * dpr;
    cv.height = cssSize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGuide();
  }

  function reset() {
    if (!cv) return;
    coveredSet = new Set();
    done = false;
    drawGuide();
  }

  window.svTrace = {
    start,
    markAt,
    coverage,
    reset,
    _cells: () => targetCells.length,
    _done: () => done,
  };
})();
